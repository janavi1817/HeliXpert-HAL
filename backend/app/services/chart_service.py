import pandas as pd
from typing import Dict, Any, List

class ChartService:
    @staticmethod
    def generate_dashboard_charts(df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Dynamically generates rich, interactive charts for ANY dataset.
        Adapts intelligently to whatever columns exist in the DataFrame.
        Zero hardcoded values.
        """
        if df.empty or len(df.columns) == 0:
            return []

        charts: List[Dict[str, Any]] = []
        cols_lower = {str(c).lower(): str(c) for c in df.columns}

        # Identify column types
        num_cols = list(df.select_dtypes(include=["number"]).columns)
        cat_cols = list(df.select_dtypes(include=["object", "category", "string"]).columns)
        date_cols = list(df.select_dtypes(include=["datetime", "datetimetz"]).columns)

        # Check for year/date columns in string or integer format
        year_candidate = None
        for c in df.columns:
            c_low = str(c).lower()
            if any(term in c_low for term in ["year", "date", "timestamp", "dt"]):
                year_candidate = c
                break

        # ── CHART 1: Primary Category Distribution (Bar Chart) ──────────────────
        primary_cat = None
        # Prefer meaningful categorical columns with between 2 and 50 unique values
        for c in cat_cols:
            n_uniq = df[c].nunique(dropna=True)
            if 2 <= n_uniq <= 50:
                primary_cat = c
                break
        if not primary_cat and cat_cols:
            primary_cat = cat_cols[0]

        if primary_cat:
            cat_counts = df[primary_cat].dropna().value_counts().head(10).reset_index()
            cat_counts.columns = ["name", "count"]
            clean_title = str(primary_cat).replace("_", " ").title()
            charts.append({
                "id": f"dist_{primary_cat}",
                "title": f"Distribution by {clean_title}",
                "subtitle": f"Top recorded values in {clean_title}",
                "type": "bar",
                "xAxisKey": "name",
                "dataKey": "count",
                "color": "#818cf8",
                "data": cat_counts.to_dict(orient="records")
            })

        # ── CHART 2: Secondary Category Breakdown (Donut Chart) ─────────────────
        secondary_cat = None
        for c in cat_cols:
            if c != primary_cat:
                n_uniq = df[c].nunique(dropna=True)
                if 2 <= n_uniq <= 12:
                    secondary_cat = c
                    break

        if secondary_cat:
            status_counts = df[secondary_cat].dropna().value_counts().head(8).reset_index()
            status_counts.columns = ["name", "value"]
            clean_title = str(secondary_cat).replace("_", " ").title()
            charts.append({
                "id": f"donut_{secondary_cat}",
                "title": f"{clean_title} Breakdown",
                "subtitle": f"Proportional split across {clean_title}",
                "type": "donut",
                "dataKey": "value",
                "nameKey": "name",
                "colors": ["#818cf8", "#a78bfa", "#c084fc", "#38bdf8", "#34d399", "#f59e0b", "#f43f5e"],
                "data": status_counts.to_dict(orient="records")
            })

        # ── CHART 3: Aggregation of Metric by Category (Horizontal Bar) ─────────
        if num_cols and primary_cat:
            primary_num = num_cols[0]
            # Find a num col that is not an ID
            for nc in num_cols:
                if not any(term in str(nc).lower() for term in ["id", "index", "code", "key"]):
                    primary_num = nc
                    break

            try:
                grouped = df.dropna(subset=[primary_cat, primary_num]).groupby(primary_cat)[primary_num].mean().sort_values(ascending=False).head(8).reset_index()
                grouped.columns = ["name", "avg_value"]
                grouped["avg_value"] = grouped["avg_value"].round(2)
                clean_num = str(primary_num).replace("_", " ").title()
                clean_cat = str(primary_cat).replace("_", " ").title()
                charts.append({
                    "id": f"avg_{primary_num}_by_{primary_cat}",
                    "title": f"Average {clean_num} by {clean_cat}",
                    "subtitle": f"Mean {clean_num} calculated per {clean_cat}",
                    "type": "horizontal_bar",
                    "xAxisKey": "avg_value",
                    "yAxisKey": "name",
                    "color": "#38bdf8",
                    "data": grouped.to_dict(orient="records")
                })
            except Exception:
                pass

        # ── CHART 4: Timeline / Trend (Area Chart) ──────────────────────────────
        if year_candidate:
            try:
                # If numeric year (e.g. 1990 - 2026)
                if pd.api.types.is_numeric_dtype(df[year_candidate]):
                    valid_years = df[year_candidate].dropna().astype(int)
                    if valid_years.min() >= 1900 and valid_years.max() <= 2100:
                        timeline = valid_years.value_counts().sort_index().reset_index()
                        timeline.columns = ["year", "count"]
                        clean_time = str(year_candidate).replace("_", " ").title()
                        charts.append({
                            "id": f"timeline_{year_candidate}",
                            "title": f"Records Timeline by {clean_time}",
                            "subtitle": f"Historical volume over {clean_time}",
                            "type": "area",
                            "xAxisKey": "year",
                            "dataKey": "count",
                            "color": "#c084fc",
                            "data": timeline.to_dict(orient="records")
                        })
            except Exception:
                pass

        # ── CHART 5: Numeric Distribution Histogram ─────────────────────────────
        for nc in num_cols:
            if not any(term in str(nc).lower() for term in ["id", "index", "code", "key"]):
                series = df[nc].dropna()
                if len(series) > 1 and series.nunique() > 3:
                    try:
                        counts, bin_edges = pd.cut(series, bins=min(10, series.nunique()), retbins=True)
                        val_c = counts.value_counts().sort_index().reset_index()
                        val_c.columns = ["range", "count"]
                        val_c["range"] = val_c["range"].astype(str)
                        clean_nc = str(nc).replace("_", " ").title()
                        charts.append({
                            "id": f"hist_{nc}",
                            "title": f"{clean_nc} Distribution",
                            "subtitle": f"Frequency distribution across value intervals",
                            "type": "bar",
                            "xAxisKey": "range",
                            "dataKey": "count",
                            "color": "#34d399",
                            "data": val_c.to_dict(orient="records")
                        })
                        break
                    except Exception:
                        pass

        # ── CHART 6: Correlation Scatter (if at least 2 numeric columns) ─────────
        if len(num_cols) >= 2:
            num1 = num_cols[0]
            num2 = num_cols[1]
            sample_sub = df.dropna(subset=[num1, num2])
            if len(sample_sub) > 60:
                sample_sub = sample_sub.sample(60, random_state=42)

            scatter_points = []
            label_col = cat_cols[0] if cat_cols else None
            for _, r in sample_sub.iterrows():
                try:
                    scatter_points.append({
                        "name": str(r[label_col]) if label_col else "Record",
                        "x": round(float(r[num1]), 2),
                        "y": round(float(r[num2]), 2)
                    })
                except Exception:
                    continue

            if len(scatter_points) > 5:
                c1_clean = str(num1).replace("_", " ").title()
                c2_clean = str(num2).replace("_", " ").title()
                charts.append({
                    "id": f"scatter_{num1}_{num2}",
                    "title": f"{c1_clean} vs {c2_clean}",
                    "subtitle": f"Bivariate data correlation",
                    "type": "scatter",
                    "xAxisKey": "x",
                    "yAxisKey": "y",
                    "color": "#f59e0b",
                    "data": scatter_points
                })

        return charts

chart_service = ChartService()
