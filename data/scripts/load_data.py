import os
import sqlite3
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(BASE_DIR, "raw")
PROCESSED_DIR = os.path.join(BASE_DIR, "processed")
DB_PATH = os.path.join(PROCESSED_DIR, "olist.db")

os.makedirs(PROCESSED_DIR, exist_ok=True)

TABLE_FILES = {
    "orders": "olist_orders_dataset.csv",
    "order_items": "olist_order_items_dataset.csv",
    "order_payments": "olist_order_payments_dataset.csv",
    "order_reviews": "olist_order_reviews_dataset.csv",
    "customers": "olist_customers_dataset.csv",
    "products": "olist_products_dataset.csv",
    "sellers": "olist_sellers_dataset.csv",
    "product_category_name_translation": "product_category_name_translation.csv"
}

def load_data():
    conn = sqlite3.connect(DB_PATH)
    print(f"Connecting to SQLite: {DB_PATH}")

    trans_path = os.path.join(RAW_DIR, TABLE_FILES["product_category_name_translation"])
    translation_df = None
    if os.path.exists(trans_path):
        translation_df = pd.read_csv(trans_path)

    for table_name, file_name in TABLE_FILES.items():
        if table_name == "product_category_name_translation":
            continue
            
        file_path = os.path.join(RAW_DIR, file_name)
        if not os.path.exists(file_path):
            print(f"Warning: File not found: {file_name}")
            continue

        print(f"Loading table: {table_name}...")
        df = pd.read_csv(file_path)

        if table_name == "products" and translation_df is not None:
            df = df.merge(translation_df, on="product_category_name", how="left")
            df["product_category_name"] = df["product_category_name_english"].fillna(df["product_category_name"])
            df.drop(columns=["product_category_name_english"], inplace=True)

        for col in df.columns:
            if 'date' in col or 'timestamp' in col:
                df[col] = pd.to_datetime(df[col], errors='coerce').dt.strftime('%Y-%m-%d %H:%M:%S')

        df.to_sql(table_name, conn, if_exists="replace", index=False)
        print(f"Finished loading {table_name} ({len(df):,} rows)")

    conn.close()
    print("Data loaded successfully.")

if __name__ == "__main__":
    load_data()