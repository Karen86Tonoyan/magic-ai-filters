from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class BuilderComponentModel(BaseModel):
    model_config = ConfigDict(extra='forbid')

    id: str
    type: str
    name: str | None = None
    props: dict[str, Any] = Field(default_factory=dict)
    children: list[str] = Field(default_factory=list)


class StateFieldModel(BaseModel):
    model_config = ConfigDict(extra='forbid')

    name: str
    type: Literal['string', 'number', 'boolean', 'object', 'array'] = 'string'
    default: Any = None


class AppConditionModel(BaseModel):
    model_config = ConfigDict(extra='forbid')

    source: str
    operator: Literal['equals', 'not_equals', 'gt', 'gte', 'lt', 'lte', 'exists', 'truthy', 'contains'] = 'equals'
    value: Any = None


class AppActionModel(BaseModel):
    model_config = ConfigDict(extra='forbid')

    type: str
    target: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class EventBindingModel(BaseModel):
    model_config = ConfigDict(extra='forbid')

    event: str
    conditions: list[AppConditionModel] = Field(default_factory=list)
    actions: list[AppActionModel] = Field(default_factory=list)


class NoCodeAppSchemaModel(BaseModel):
    model_config = ConfigDict(extra='forbid')

    name: str
    version: str = '1.0.0'
    components: list[BuilderComponentModel] = Field(default_factory=list)
    state: list[StateFieldModel] = Field(default_factory=list)
    bindings: list[EventBindingModel] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class GuardianValidationModel(BaseModel):
    model_config = ConfigDict(extra='forbid')

    is_valid: bool
    blocked_reasons: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    required_permissions: list[str] = Field(default_factory=list)
    declared_permissions: list[str] = Field(default_factory=list)
    signature: str


class DeployAppRequestModel(BaseModel):
    model_config = ConfigDict(extra='forbid', populate_by_name=True)

    app_schema: NoCodeAppSchemaModel = Field(alias='schema')


class AppDeploymentResponseModel(BaseModel):
    model_config = ConfigDict(extra='forbid')

    app_id: str
    name: str
    status: Literal['deployed']
    guardian: GuardianValidationModel
    state: dict[str, Any] = Field(default_factory=dict)


class ExecuteAppRequestModel(BaseModel):
    model_config = ConfigDict(extra='forbid')

    event: str
    input: dict[str, Any] = Field(default_factory=dict)
    token: str | None = None
    cloud_attested: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)


class AppExecutionResponseModel(BaseModel):
    model_config = ConfigDict(extra='forbid')

    app_id: str
    status: Literal['ok', 'blocked']
    event: str
    executed_actions: list[dict[str, Any]] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    state: dict[str, Any] = Field(default_factory=dict)


class AppStateResponseModel(BaseModel):
    model_config = ConfigDict(extra='forbid')

    app_id: str
    name: str
    status: Literal['running']
    state: dict[str, Any] = Field(default_factory=dict)
