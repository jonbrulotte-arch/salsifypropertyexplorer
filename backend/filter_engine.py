from typing import Any
from .data_loader import get_products, get_product_value
from .models import FilterCondition


def _coerce_number(val: Any) -> float | None:
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def _matches(product: dict, f: FilterCondition) -> bool:
    raw = product.get(f.property)
    val = get_product_value(product, f.property)

    if f.operator == "is_empty":
        return raw is None or raw == "" or raw == [] or raw == {}
    if f.operator == "is_not_empty":
        return raw is not None and raw != "" and raw != [] and raw != {}

    if val is None:
        return False

    filter_val = f.value

    # List-valued attributes: check membership for equality-style ops
    if isinstance(val, list):
        str_list = [str(v).lower() for v in val]
        if f.operator == "equals":
            return str(filter_val).lower() in str_list
        if f.operator == "not_equals":
            return str(filter_val).lower() not in str_list
        if f.operator == "contains":
            fv = str(filter_val).lower()
            return any(fv in item for item in str_list)
        if f.operator in ("is_true", "is_false"):
            return False
        return False

    str_val = str(val).lower()
    str_filter = str(filter_val).lower() if filter_val is not None else ""

    if f.operator == "equals":
        return str_val == str_filter
    if f.operator == "not_equals":
        return str_val != str_filter
    if f.operator == "contains":
        return str_filter in str_val
    if f.operator == "starts_with":
        return str_val.startswith(str_filter)
    if f.operator == "ends_with":
        return str_val.endswith(str_filter)
    if f.operator == "is_true":
        return val is True or str_val in ("true", "1", "yes")
    if f.operator == "is_false":
        return val is False or str_val in ("false", "0", "no")

    num_val = _coerce_number(val)
    num_filter = _coerce_number(filter_val)
    if num_val is None or num_filter is None:
        return False
    if f.operator == "gt":
        return num_val > num_filter
    if f.operator == "lt":
        return num_val < num_filter
    if f.operator == "gte":
        return num_val >= num_filter
    if f.operator == "lte":
        return num_val <= num_filter

    return False


def apply_filters(
    filters: list[FilterCondition],
    include_children: bool = True,
) -> list[dict]:
    products = get_products()

    if not include_children:
        products = [p for p in products if "salsify:parent_id" not in p or p["salsify:parent_id"] is None]

    if not filters:
        return products

    return [p for p in products if all(_matches(p, f) for f in filters)]
