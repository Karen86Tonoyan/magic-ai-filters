from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class BriefcaseStatusResponseModel(BaseModel):
    model_config = ConfigDict(extra='forbid')

    installed: bool
    version: str | None = None
    available_platforms: list[str] = Field(default_factory=list)


class BriefcaseCreateProjectRequestModel(BaseModel):
    model_config = ConfigDict(extra='forbid')

    name: str
    template: Literal['toga', 'console', 'flask'] = 'toga'
    app_name: str | None = None
    bundle_id: str | None = None
    description: str | None = None


class BriefcaseProjectFileModel(BaseModel):
    model_config = ConfigDict(extra='forbid')

    path: str
    content: str


class BriefcaseUpdateFilesRequestModel(BaseModel):
    model_config = ConfigDict(extra='forbid')

    files: list[BriefcaseProjectFileModel] = Field(default_factory=list)


class BriefcaseBuildRequestModel(BaseModel):
    model_config = ConfigDict(extra='forbid')

    platform: Literal['macOS', 'windows', 'linux', 'iOS', 'android']


class BriefcaseProjectResponseModel(BaseModel):
    model_config = ConfigDict(extra='forbid')

    id: str
    name: str
    template: str
    path: str
    app_name: str
    bundle_id: str
    description: str
    created_at: str
    files: list[str] = Field(default_factory=list)


class BriefcaseUpdateFilesResponseModel(BaseModel):
    model_config = ConfigDict(extra='forbid')

    ok: bool
    files_written: int
    files: list[str] = Field(default_factory=list)


class BriefcaseActionResponseModel(BaseModel):
    model_config = ConfigDict(extra='forbid')

    success: bool
    logs: list[str] = Field(default_factory=list)
    error: str | None = None


class BriefcaseRunResponseModel(BaseModel):
    model_config = ConfigDict(extra='forbid')

    message: str


class BriefcaseDeleteResponseModel(BaseModel):
    model_config = ConfigDict(extra='forbid')

    ok: bool
