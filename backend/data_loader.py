import json
import zipfile
from collections import Counter
from pathlib import Path
from typing import Any

DATA_ZIP = Path(__file__).parent.parent / "data.zip"

_products: list[dict] = []
_attributes: list[dict] = []
_attribute_values: list[dict] = []
_attribute_map: dict[str, dict] = {}
_enum_values: dict[str, list[str]] = {}
_product_unique_values: dict[str, list[str]] = {}

MAX_UNIQUE_VALUES = 300


def _flatten_value(val: Any) -> Any:
    """Unwrap localized dicts to their en-US string."""
    if isinstance(val, dict) and "en-US" in val:
        return val["en-US"]
    return val


def _build_unique_values() -> None:
    """Scan all products to build unique value lists per property.
    Only kept when count <= MAX_UNIQUE_VALUES (free-form text fields skipped)."""
    global _product_unique_values
    counts: dict[str, Counter] = {}

    for product in _products:
        for key, raw in product.items():
            if key.startswith("salsify:"):
                continue
            val = _flatten_value(raw)
            if val is None or val == "" or val == [] or val == {}:
                continue
            if key not in counts:
                counts[key] = Counter()
            if isinstance(val, list):
                for v in val:
                    if v is not None and str(v).strip():
                        counts[key][str(v)] += 1
            else:
                counts[key][str(val)] += 1

    _product_unique_values = {
        key: sorted(counter.keys(), key=str.lower)
        for key, counter in counts.items()
        if len(counter) <= MAX_UNIQUE_VALUES
    }


def load_data() -> None:
    global _products, _attributes, _attribute_values, _attribute_map, _enum_values

    with zipfile.ZipFile(DATA_ZIP) as zf:
        with zf.open("data.json") as f:
            raw = json.load(f)

    sections = {list(item.keys())[0]: list(item.values())[0] for item in raw}

    _attributes = sections.get("attributes", [])
    _attribute_values = sections.get("attribute_values", [])
    _products = sections.get("products", [])

    _attribute_map = {a["salsify:id"]: a for a in _attributes}

    for av in _attribute_values:
        attr_id = av["salsify:attribute_id"]
        _enum_values.setdefault(attr_id, [])
        _enum_values[attr_id].append(av["salsify:name"])

    _build_unique_values()


def get_products() -> list[dict]:
    return _products


def get_attributes() -> list[dict]:
    return _attributes


def get_attribute_map() -> dict[str, dict]:
    return _attribute_map


def get_enum_values() -> dict[str, list[str]]:
    return _product_unique_values


def get_product_value(product: dict, prop: str) -> Any:
    """Return the resolved (flattened) value of a property on a product."""
    val = product.get(prop)
    if val is None:
        return None
    return _flatten_value(val)
