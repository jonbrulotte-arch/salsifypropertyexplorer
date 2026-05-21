import json
import math
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .data_loader import load_data, get_attributes, get_attribute_map, get_enum_values, get_product_value
from .filter_engine import apply_filters
from .models import (
    AdminSettings, AttributeInfo, FilterRequest, FilterResponse,
    ProductSummary, PropertyStat, ReportResponse,
)

SETTINGS_FILE = Path(__file__).parent / "admin_settings.json"
FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"

_settings: AdminSettings = AdminSettings()


def _load_settings() -> None:
    global _settings
    if SETTINGS_FILE.exists():
        _settings = AdminSettings.model_validate(json.loads(SETTINGS_FILE.read_text()))


def _save_settings() -> None:
    SETTINGS_FILE.write_text(_settings.model_dump_json(indent=2))


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_data()
    _load_settings()
    yield


app = FastAPI(title="Salsify Property Explorer", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/attributes", response_model=list[AttributeInfo])
def list_attributes():
    attr_map = get_attribute_map()
    enum_values = get_enum_values()
    aliases = _settings.property_aliases
    hidden = set(_settings.hidden_properties)

    result = []
    for attr in get_attributes():
        attr_id = attr["salsify:id"]
        if attr_id in hidden:
            continue
        result.append(AttributeInfo(
            id=attr_id,
            name=attr_id,
            display_name=aliases.get(attr_id, attr.get("salsify:name", attr_id)),
            group=attr.get("salsify:attribute_group") or "Unassigned",
            data_type=attr.get("salsify:data_type", "string"),
            is_facetable=attr.get("salsify:is_facetable", False),
            enum_values=enum_values.get(attr_id, []),
        ))
    return result


@app.post("/api/products/filter", response_model=FilterResponse)
def filter_products(req: FilterRequest):
    matched = apply_filters(req.filters, req.include_children)
    total = len(matched)
    pages = max(1, math.ceil(total / req.page_size))
    page = max(1, min(req.page, pages))
    start = (page - 1) * req.page_size
    page_products = matched[start: start + req.page_size]

    def summarize(p: dict) -> ProductSummary:
        name = get_product_value(p, "Item Name")
        if isinstance(name, list):
            name = name[0] if name else None
        brand = get_product_value(p, "Brand")
        cat = get_product_value(p, "JSP Category")
        status = get_product_value(p, "Inventory Status")
        return ProductSummary(
            id=p.get("salsify:id", ""),
            item_name=str(name) if name is not None else None,
            brand=str(brand) if brand is not None else None,
            jsp_category=str(cat) if cat is not None else None,
            inventory_status=str(status) if status is not None else None,
            is_child="salsify:parent_id" in p and p["salsify:parent_id"] is not None,
        )

    return FilterResponse(
        total=total,
        page=page,
        page_size=req.page_size,
        pages=pages,
        products=[summarize(p) for p in page_products],
    )


@app.post("/api/products/report", response_model=ReportResponse)
def property_report(req: FilterRequest):
    matched = apply_filters(req.filters, req.include_children)
    total = len(matched)
    attr_map = get_attribute_map()
    aliases = _settings.property_aliases
    highlighted = set(_settings.highlighted_properties)
    hidden = set(_settings.hidden_properties)
    min_pct = _settings.report_min_coverage_pct

    counts: dict[str, int] = {}
    for product in matched:
        for key, val in product.items():
            if key.startswith("salsify:"):
                continue
            if key in hidden:
                continue
            if val is None or val == "" or val == [] or val == {}:
                continue
            counts[key] = counts.get(key, 0) + 1

    stats = []
    for prop, count in counts.items():
        pct = (count / total * 100) if total > 0 else 0.0
        if pct < min_pct:
            continue
        attr = attr_map.get(prop, {})
        stats.append(PropertyStat(
            property_name=prop,
            display_name=aliases.get(prop, prop),
            group=attr.get("salsify:attribute_group") or "Unassigned",
            data_type=attr.get("salsify:data_type", "string"),
            count=count,
            coverage_pct=round(pct, 1),
            highlighted=prop in highlighted,
        ))

    sort_key = _settings.report_default_sort
    if sort_key == "coverage_desc":
        stats.sort(key=lambda s: -s.coverage_pct)
    elif sort_key == "coverage_asc":
        stats.sort(key=lambda s: s.coverage_pct)
    elif sort_key == "name_asc":
        stats.sort(key=lambda s: s.display_name.lower())
    elif sort_key == "name_desc":
        stats.sort(key=lambda s: s.display_name.lower(), reverse=True)

    return ReportResponse(total_products=total, properties=stats)


@app.get("/api/admin/settings", response_model=AdminSettings)
def get_admin_settings():
    return _settings


@app.put("/api/admin/settings", response_model=AdminSettings)
def update_admin_settings(settings: AdminSettings):
    global _settings
    _settings = settings
    _save_settings()
    return _settings


if FRONTEND_DIST.exists():
    from fastapi.responses import FileResponse

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        file = FRONTEND_DIST / full_path
        if file.is_file():
            return FileResponse(file)
        return FileResponse(FRONTEND_DIST / "index.html")

    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")
