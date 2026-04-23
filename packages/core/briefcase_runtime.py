from __future__ import annotations

import os
import re
import shutil
import subprocess
import tempfile
import zipfile
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from packages.schemas.briefcase import (
    BriefcaseActionResponseModel,
    BriefcaseBuildRequestModel,
    BriefcaseCreateProjectRequestModel,
    BriefcaseDeleteResponseModel,
    BriefcaseProjectResponseModel,
    BriefcaseRunResponseModel,
    BriefcaseStatusResponseModel,
    BriefcaseUpdateFilesRequestModel,
    BriefcaseUpdateFilesResponseModel,
)

SUPPORTED_PLATFORMS = ['macOS', 'windows', 'linux', 'iOS', 'android']


@dataclass(slots=True)
class BriefcaseProjectRecord:
    project_id: str
    name: str
    template: str
    path: Path
    app_name: str
    bundle_id: str
    description: str
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_model(self, files: list[str]) -> BriefcaseProjectResponseModel:
        return BriefcaseProjectResponseModel(
            id=self.project_id,
            name=self.name,
            template=self.template,
            path=str(self.path),
            app_name=self.app_name,
            bundle_id=self.bundle_id,
            description=self.description,
            created_at=self.created_at,
            files=files,
        )


class BriefcaseProjectRuntime:
    def __init__(self, projects_dir: Path | None = None) -> None:
        default_dir = Path(tempfile.gettempdir()) / 'alfa-briefcase'
        configured_dir = os.getenv('ALFA_BRIEFCASE_PROJECTS_DIR')
        self.projects_dir = Path(projects_dir or configured_dir or default_dir)
        self.projects_dir.mkdir(parents=True, exist_ok=True)
        self._projects: dict[str, BriefcaseProjectRecord] = {}

    def status(self) -> BriefcaseStatusResponseModel:
        executable = self._briefcase_executable()
        if executable is None:
            return BriefcaseStatusResponseModel(installed=False, version=None, available_platforms=SUPPORTED_PLATFORMS)

        try:
            result = subprocess.run(
                [executable, '--version'],
                capture_output=True,
                text=True,
                timeout=10,
                check=False,
            )
        except (OSError, subprocess.SubprocessError):
            return BriefcaseStatusResponseModel(installed=False, version=None, available_platforms=SUPPORTED_PLATFORMS)

        version = result.stdout.strip() or result.stderr.strip() or None
        return BriefcaseStatusResponseModel(
            installed=result.returncode == 0,
            version=version,
            available_platforms=SUPPORTED_PLATFORMS,
        )

    def list_projects(self) -> list[BriefcaseProjectResponseModel]:
        return [record.to_model(self._list_files(record.path)) for record in self._projects.values()]

    def create_project(self, request: BriefcaseCreateProjectRequestModel) -> BriefcaseProjectResponseModel:
        project_id = self._new_project_id()
        slug = self._slugify(request.name)
        project_path = self.projects_dir / f'{slug}-{project_id}'
        project_path.mkdir(parents=True, exist_ok=True)

        app_name = request.app_name or slug.replace('-', '_')
        bundle_id = request.bundle_id or f'local.alfa.{app_name}'
        description = request.description or f'Briefcase scaffold for {request.name}'

        record = BriefcaseProjectRecord(
            project_id=project_id,
            name=request.name,
            template=request.template,
            path=project_path,
            app_name=app_name,
            bundle_id=bundle_id,
            description=description,
        )
        self._projects[project_id] = record
        self._seed_project(record)
        return record.to_model(self._list_files(record.path))

    def update_files(
        self,
        project_id: str,
        request: BriefcaseUpdateFilesRequestModel,
    ) -> BriefcaseUpdateFilesResponseModel:
        record = self._projects[project_id]
        for item in request.files:
            target = self._resolve_child(record.path, item.path)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(item.content, encoding='utf-8')

        return BriefcaseUpdateFilesResponseModel(
            ok=True,
            files_written=len(request.files),
            files=self._list_files(record.path),
        )

    def build_project(self, project_id: str, request: BriefcaseBuildRequestModel) -> BriefcaseActionResponseModel:
        record = self._projects[project_id]
        executable = self._briefcase_executable()
        if executable is None:
            return BriefcaseActionResponseModel(
                success=False,
                logs=[],
                error='Briefcase is not installed.',
            )

        result = subprocess.run(
            [executable, 'build', request.platform.lower()],
            cwd=record.path,
            capture_output=True,
            text=True,
            timeout=300,
            check=False,
        )
        logs = self._collect_logs(result.stdout, result.stderr)
        return BriefcaseActionResponseModel(
            success=result.returncode == 0,
            logs=logs,
            error=None if result.returncode == 0 else (result.stderr.strip() or 'Briefcase build failed.'),
        )

    def run_project(self, project_id: str) -> BriefcaseRunResponseModel:
        record = self._projects[project_id]
        executable = self._briefcase_executable()
        if executable is None:
            raise RuntimeError('Briefcase is not installed.')

        subprocess.Popen(
            [executable, 'dev'],
            cwd=record.path,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return BriefcaseRunResponseModel(message='Started briefcase dev mode.')

    def export_project(self, project_id: str) -> Path:
        record = self._projects[project_id]
        zip_path = self.projects_dir / f'{record.path.name}.zip'
        if zip_path.exists():
            zip_path.unlink()

        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as archive:
            for file_path in record.path.rglob('*'):
                if file_path.is_file():
                    archive.write(file_path, arcname=file_path.relative_to(record.path))
        return zip_path

    def delete_project(self, project_id: str) -> BriefcaseDeleteResponseModel:
        record = self._projects[project_id]
        shutil.rmtree(record.path, ignore_errors=True)
        del self._projects[project_id]
        return BriefcaseDeleteResponseModel(ok=True)

    @staticmethod
    def _briefcase_executable() -> str | None:
        return shutil.which('briefcase')

    @staticmethod
    def _new_project_id() -> str:
        from uuid import uuid4

        return uuid4().hex[:8]

    @staticmethod
    def _slugify(value: str) -> str:
        slug = re.sub(r'[^a-zA-Z0-9]+', '-', value).strip('-').lower()
        return slug or 'briefcase-project'

    @staticmethod
    def _collect_logs(stdout: str, stderr: str) -> list[str]:
        logs = [line for line in stdout.splitlines() if line.strip()]
        logs.extend(line for line in stderr.splitlines() if line.strip())
        return logs

    @staticmethod
    def _resolve_child(base: Path, relative_path: str) -> Path:
        rel = Path(relative_path)
        if rel.is_absolute():
            raise ValueError('Absolute paths are not allowed.')
        candidate = (base / rel).resolve()
        if not candidate.is_relative_to(base.resolve()):
            raise ValueError('File path must stay inside the project directory.')
        return candidate

    @staticmethod
    def _list_files(base: Path) -> list[str]:
        return sorted(str(path.relative_to(base)).replace('\\', '/') for path in base.rglob('*') if path.is_file())

    def _seed_project(self, record: BriefcaseProjectRecord) -> None:
        files = {
            'README.md': self._readme_content(record),
            'briefcase.seed.json': self._seed_metadata(record),
        }
        files.update(self._template_files(record))

        for relative_path, content in files.items():
            target = record.path / relative_path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding='utf-8')

    @staticmethod
    def _readme_content(record: BriefcaseProjectRecord) -> str:
        return (
            f'# {record.name}\n\n'
            f'Template: {record.template}\n\n'
            'This scaffold was salvaged from the archived ollamaagentalfa-v2-experiment builder.\n'
            'Use the API to update files, export the project, and optionally run Briefcase if it is installed locally.\n'
        )

    @staticmethod
    def _seed_metadata(record: BriefcaseProjectRecord) -> str:
        return (
            '{\n'
            f'  "name": "{record.name}",\n'
            f'  "template": "{record.template}",\n'
            f'  "app_name": "{record.app_name}",\n'
            f'  "bundle_id": "{record.bundle_id}"\n'
            '}\n'
        )

    @staticmethod
    def _template_files(record: BriefcaseProjectRecord) -> dict[str, str]:
        if record.template == 'console':
            return {
                'src/__main__.py': (
                    'def main() -> None:\n'
                    f'    print("{record.name} is ready.")\n\n'
                    'if __name__ == "__main__":\n'
                    '    main()\n'
                )
            }
        if record.template == 'flask':
            return {
                'app.py': (
                    'from flask import Flask\n\n'
                    'app = Flask(__name__)\n\n'
                    '@app.get("/")\n'
                    'def health() -> dict[str, str]:\n'
                    f'    return {{"status": "ok", "app": "{record.app_name}"}}\n'
                )
            }
        return {
            'src/app.py': (
                'def main() -> None:\n'
                f'    print("Launch GUI scaffold for {record.name}.")\n\n'
                'if __name__ == "__main__":\n'
                '    main()\n'
            )
        }
