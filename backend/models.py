from typing import Any, Literal, Optional
from pydantic import BaseModel


class FilterCondition(BaseModel):
    property: str
    operator: Literal[
        "equals", "not_equals", "contains", "starts_with", "ends_with",
        "gt", "lt", "gte", "lte",
        "is_true", "is_false",
        "is_empty", "is_not_empty",
    ]
    value: Optional[Any] = None


class FilterRequest(BaseModel):
    filters: list[FilterCondition] = []
    include_children: bool = True
    page: int = 1
    page_size: int = 50


class ProductSummary(BaseModel):
    id: str
    item_name: Optional[str]
    brand: Optional[str]
    jsp_category: Optional[str]
    inventory_status: Optional[str]
    is_child: bool


class FilterResponse(BaseModel):
    total: int
    page: int
    page_size: int
    pages: int
    products: list[ProductSummary]


class PropertyStat(BaseModel):
    property_name: str
    display_name: str
    group: str
    data_type: str
    count: int
    coverage_pct: float
    highlighted: bool


class ReportResponse(BaseModel):
    total_products: int
    properties: list[PropertyStat]


class FilterPreset(BaseModel):
    name: str
    filters: list[FilterCondition]


class AdminSettings(BaseModel):
    hidden_properties: list[str] = []
    property_aliases: dict[str, str] = {}
    report_min_coverage_pct: float = 0.0
    report_default_sort: Literal["coverage_desc", "coverage_asc", "name_asc", "name_desc"] = "coverage_desc"
    filter_presets: list[FilterPreset] = []
    exclude_children_by_default: bool = False
    highlighted_properties: list[str] = []


class AttributeInfo(BaseModel):
    id: str
    name: str
    display_name: str
    group: str
    data_type: str
    is_facetable: bool
    enum_values: list[str] = []
