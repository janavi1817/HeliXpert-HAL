import numpy as np
import pandas as pd
from typing import Dict, Any, List

class StatisticsService:
    @staticmethod
    def calculate_column_statistics(df: pd.DataFrame) -> Dict[str, Any]:
        """Calculates comprehensive statistics for every column in the dataset"""
        total_rows = len(df)
        columns_info = []
        numeric_col_count = 0
        categorical_col_count = 0
        total_missing = 0

        for col in df.columns:
            series = df[col]
            missing_count = int(series.isna().sum())
            total_missing += missing_count
            unique_count = int(series.nunique(dropna=True))
            
            is_numeric = pd.api.types.is_numeric_dtype(series)
            
            col_stat = {
                "column_name": str(col),
                "type": "numeric" if is_numeric else "categorical",
                "unique_values": unique_count,
                "missing_values": missing_count,
                "missing_percentage": round((missing_count / total_rows * 100) if total_rows > 0 else 0, 2),
            }
            
            if is_numeric:
                numeric_col_count += 1
                valid_data = series.dropna()
                if len(valid_data) > 0:
                    min_val = float(valid_data.min())
                    max_val = float(valid_data.max())
                    mean_val = float(valid_data.mean())
                    median_val = float(valid_data.median())
                    std_val = float(valid_data.std()) if len(valid_data) > 1 else 0.0
                    
                    # Generate histogram bins
                    hist_data = []
                    try:
                        counts, bin_edges = np.histogram(valid_data, bins=min(10, unique_count if unique_count > 0 else 1))
                        for i in range(len(counts)):
                            hist_data.append({
                                "range": f"{round(bin_edges[i], 1)} - {round(bin_edges[i+1], 1)}",
                                "count": int(counts[i])
                            })
                    except Exception:
                        hist_data = []

                    col_stat.update({
                        "min": round(min_val, 2),
                        "max": round(max_val, 2),
                        "average": round(mean_val, 2),
                        "median": round(median_val, 2),
                        "std_dev": round(std_val, 2),
                        "histogram": hist_data
                    })
                else:
                    col_stat.update({
                        "min": None, "max": None, "average": None,
                        "median": None, "std_dev": None, "histogram": []
                    })
            else:
                categorical_col_count += 1
                # Top frequent values
                value_counts = series.dropna().value_counts().head(8).to_dict()
                top_values = [{"label": str(k), "count": int(v)} for k, v in value_counts.items()]
                col_stat.update({
                    "min": None,
                    "max": None,
                    "average": None,
                    "top_values": top_values,
                    "sample_values": [str(x) for x in series.dropna().unique()[:5]]
                })
                
            columns_info.append(col_stat)

        summary_stats = {
            "total_rows": total_rows,
            "total_columns": len(df.columns),
            "numeric_columns": numeric_col_count,
            "categorical_columns": categorical_col_count,
            "total_missing_values": total_missing,
            "columns": columns_info
        }
        
        return summary_stats

statistics_service = StatisticsService()
