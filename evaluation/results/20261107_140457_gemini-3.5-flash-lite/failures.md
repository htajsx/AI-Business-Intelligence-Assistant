# Failures

Total failed questions: 16

## Q019 (medium, en, single_table) - wrong

**Question:** What is the average product weight by product category name?

**Gold SQL:**
```sql
SELECT product_category_name AS category, ROUND(AVG(product_weight_g), 2) AS avg_weight FROM products WHERE product_category_name IS NOT NULL GROUP BY product_category_name ORDER BY avg_weight DESC, category ASC
```
**Predicted SQL:**
```sql
SELECT p.product_category_name AS category, ROUND(AVG(p.product_weight_g), 2) AS avg_weight_g FROM products p WHERE p.product_category_name IS NOT NULL GROUP BY p.product_category_name ORDER BY avg_weight_g DESC LIMIT 10
```
**Gold result (first 3 rows):**
```json
[{"category": "furniture_mattress_and_upholstery", "avg_weight": 13190.0}, {"category": "office_furniture", "avg_weight": 12740.87}, {"category": "kitchen_dining_laundry_garden_furniture", "avg_weight": 11598.56}]
```
**Predicted result (first 3 rows):**
```json
[{"category": "furniture_mattress_and_upholstery", "avg_weight_g": 13190.0}, {"category": "office_furniture", "avg_weight_g": 12740.87}, {"category": "kitchen_dining_laundry_garden_furniture", "avg_weight_g": 11598.56}]
```
**Error / note:** -

**Suggested classification:** different LIMIT / top-k

## Q020 (medium, en, single_table) - wrong

**Question:** Count of sellers in each state, ordered descending.

**Gold SQL:**
```sql
SELECT seller_state AS state, COUNT(DISTINCT seller_id) AS seller_count FROM sellers GROUP BY seller_state ORDER BY seller_count DESC, state ASC
```
**Predicted SQL:**
```sql
SELECT seller_state AS state, COUNT(*) AS seller_count FROM sellers GROUP BY seller_state ORDER BY seller_count DESC
LIMIT 100
```
**Gold result (first 3 rows):**
```json
[{"state": "SP", "seller_count": 1849}, {"state": "PR", "seller_count": 349}, {"state": "MG", "seller_count": 244}]
```
**Predicted result (first 3 rows):**
```json
[{"state": "SP", "seller_count": 1849}, {"state": "PR", "seller_count": 349}, {"state": "MG", "seller_count": 244}]
```
**Error / note:** -

**Suggested classification:** different LIMIT / top-k; DISTINCT mismatch in COUNT

## Q024 (easy, en, join) - wrong

**Question:** Count the number of order items fulfilled by sellers located in RJ state.

**Gold SQL:**
```sql
SELECT COUNT(oi.order_item_id) AS item_count FROM order_items oi JOIN sellers s ON oi.seller_id = s.seller_id WHERE s.seller_state = 'RJ'
```
**Predicted SQL:**
```sql
SELECT COUNT(*) AS item_count FROM orders o JOIN order_items oi ON o.order_id = oi.order_id JOIN sellers s ON oi.seller_id = s.seller_id WHERE o.order_status = 'delivered' AND s.seller_state = 'RJ'
LIMIT 100
```
**Gold result (first 3 rows):**
```json
[{"item_count": 4818}]
```
**Predicted result (first 3 rows):**
```json
[{"item_count": 4685}]
```
**Error / note:** -

**Suggested classification:** wrong table (pred ['order_items', 'orders', 'sellers'], gold ['order_items', 'sellers']); different LIMIT / top-k

## Q029 (medium, vi, join) - wrong

**Question:** Danh sách 5 phương thức thanh toán và tổng giá trị tương ứng cho các đơn giao thành công, sắp xếp giảm dần.

**Gold SQL:**
```sql
SELECT op.payment_type, ROUND(SUM(op.payment_value), 2) AS total_value FROM orders o JOIN order_payments op ON o.order_id = op.order_id WHERE o.order_status = 'delivered' GROUP BY op.payment_type ORDER BY total_value DESC, op.payment_type ASC LIMIT 5
```
**Predicted SQL:**
```sql
SELECT op.payment_type, ROUND(SUM(oi.price), 2) AS total_revenue FROM orders o JOIN order_payments op ON o.order_id = op.order_id JOIN order_items oi ON o.order_id = oi.order_id WHERE o.order_status = 'delivered' GROUP BY op.payment_type ORDER BY total_revenue DESC LIMIT 5
```
**Gold result (first 3 rows):**
```json
[{"payment_type": "credit_card", "total_value": 12101094.88}, {"payment_type": "boleto", "total_value": 2769932.58}, {"payment_type": "voucher", "total_value": 343013.19}]
```
**Predicted result (first 3 rows):**
```json
[{"payment_type": "credit_card", "total_revenue": 10673305.65}, {"payment_type": "boleto", "total_revenue": 2329807.64}, {"payment_type": "voucher", "total_revenue": 632719.07}]
```
**Error / note:** -

**Suggested classification:** wrong table (pred ['order_items', 'order_payments', 'orders'], gold ['order_payments', 'orders'])

## Q031 (medium, en, join) - wrong

**Question:** Count of 5-star reviews for delivered orders.

**Gold SQL:**
```sql
SELECT COUNT(DISTINCT r.review_id) AS five_star_reviews FROM orders o JOIN (SELECT review_id, order_id, review_score FROM (SELECT review_id, order_id, review_score, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY review_answer_timestamp DESC, review_id DESC) AS rn FROM order_reviews) WHERE rn = 1) r ON o.order_id = r.order_id WHERE o.order_status = 'delivered' AND r.review_score = 5
```
**Predicted SQL:**
```sql
WITH latest_review AS ( SELECT order_id, review_score FROM ( SELECT order_id, review_score, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY review_answer_timestamp DESC, review_id DESC) AS rn FROM order_reviews ) WHERE rn = 1 ) SELECT COUNT(*) AS count_5_star_reviews FROM orders o JOIN latest_review r ON o.order_id = r.order_id WHERE o.order_status = 'delivered' AND r.review_score = 5
LIMIT 100
```
**Gold result (first 3 rows):**
```json
[{"five_star_reviews": 56487}]
```
**Predicted result (first 3 rows):**
```json
[{"count_5_star_reviews": 56755}]
```
**Error / note:** -

**Suggested classification:** different LIMIT / top-k; DISTINCT mismatch in COUNT

## Q032 (medium, en, join) - wrong

**Question:** Top 5 sellers (by ID) who received the most 1-star reviews.

**Gold SQL:**
```sql
SELECT oi.seller_id, COUNT(DISTINCT r.review_id) AS bad_reviews FROM orders o JOIN order_items oi ON o.order_id = oi.order_id JOIN (SELECT review_id, order_id, review_score FROM (SELECT review_id, order_id, review_score, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY review_answer_timestamp DESC, review_id DESC) AS rn FROM order_reviews) WHERE rn = 1) r ON o.order_id = r.order_id WHERE o.order_status = 'delivered' AND r.review_score = 1 GROUP BY oi.seller_id ORDER BY bad_reviews DESC, oi.seller_id ASC LIMIT 5
```
**Predicted SQL:**
```sql
WITH latest_review AS ( SELECT order_id, review_score FROM ( SELECT order_id, review_score, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY review_answer_timestamp DESC, review_id DESC) AS rn FROM order_reviews ) WHERE rn = 1 ) SELECT s.seller_id, s.seller_state, COUNT(DISTINCT r.order_id) AS one_star_count FROM latest_review r JOIN order_items oi ON r.order_id = oi.order_id JOIN sellers s ON oi.seller_id = s.seller_id WHERE r.review_score = 1 GROUP BY s.seller_id, s.seller_state ORDER BY one_star_count DESC LIMIT 5
```
**Gold result (first 3 rows):**
```json
[{"seller_id": "4a3ca9315b744ce9f8e9374361493884", "bad_reviews": 241}, {"seller_id": "6560211a19b47992c3666cc44a7e94c0", "bad_reviews": 207}, {"seller_id": "7c67e1448b00f6e969d365cea6b010ab", "bad_reviews": 190}]
```
**Predicted result (first 3 rows):**
```json
[{"seller_id": "4a3ca9315b744ce9f8e9374361493884", "seller_state": "SP", "one_star_count": 257}, {"seller_id": "6560211a19b47992c3666cc44a7e94c0", "seller_state": "SP", "one_star_count": 230}, {"seller_id": "cc419e0650a3c5ba77189a1882b7556a", "seller_state": "SP", "one_star_count": 200}]
```
**Error / note:** -

**Suggested classification:** missing order_status = 'delivered' filter; wrong table (pred ['order_items', 'order_reviews', 'sellers'], gold ['order_items', 'order_reviews', 'orders']); different grouping

## Q037 (easy, en, time_comparison) - wrong

**Question:** How many orders were placed today (assuming today is 2018-10-17)?

**Gold SQL:**
```sql
SELECT COUNT(DISTINCT order_id) AS total_orders FROM orders WHERE date(order_purchase_timestamp) = '2018-10-17'
```
**Predicted SQL:**
```sql
SELECT COUNT(DISTINCT o.order_id) AS total_orders FROM orders o WHERE o.order_status = 'delivered'
  AND ('2018-10-17 00:00:00' IS NULL OR o.order_purchase_timestamp >= '2018-10-17 00:00:00')
  AND ('2018-10-17 23:59:59' IS NULL OR o.order_purchase_timestamp <= '2018-10-17 23:59:59')
```
**Gold result (first 3 rows):**
```json
[{"total_orders": 1}]
```
**Predicted result (first 3 rows):**
```json
[{"total_orders": 0}]
```
**Error / note:** -

**Suggested classification:** wrong tool (used get_kpi, expected run_sql)

## Q039 (easy, en, time_comparison) - no_sql

**Question:** Revenue generated in October 2018.

**Gold SQL:**
```sql
SELECT ROUND(SUM(oi.price), 2) AS total_revenue FROM orders o JOIN order_items oi ON o.order_id = oi.order_id WHERE o.order_status = 'delivered' AND o.order_purchase_timestamp >= '2018-10-01' AND o.order_purchase_timestamp < '2018-11-01'
```
**Predicted SQL:**
```sql
SELECT ROUND(SUM(oi.price), 2) AS total_revenue FROM orders o JOIN order_items oi ON o.order_id = oi.order_id WHERE o.order_status = 'delivered' AND o.order_purchase_timestamp >= '2018-10-01' AND o.order_purchase_timestamp < '2018-11-01'
LIMIT 100
```
**Gold result (first 3 rows):**
```json
[{"total_revenue": null}]
```
**Predicted result (first 3 rows):**
```json
null
```
**Error / note:** I reached the tool call limit before finishing. Please narrow the question and try again.

**Suggested classification:** no final answer (status=max_steps); no SQL produced; wrong tool (used get_kpi, expected run_sql)

## Q040 (easy, en, time_comparison) - no_sql

**Question:** Delivered order count in September 2018.

**Gold SQL:**
```sql
SELECT COUNT(DISTINCT order_id) AS total_orders FROM orders WHERE order_status = 'delivered' AND order_purchase_timestamp >= '2018-09-01' AND order_purchase_timestamp < '2018-10-01'
```
**Predicted SQL:**
```sql
SELECT MIN(order_purchase_timestamp), MAX(order_purchase_timestamp) FROM orders
LIMIT 100
```
**Gold result (first 3 rows):**
```json
[{"total_orders": 0}]
```
**Predicted result (first 3 rows):**
```json
null
```
**Error / note:** I reached the tool call limit before finishing. Please narrow the question and try again.

**Suggested classification:** no final answer (status=max_steps); no SQL produced; wrong tool (used get_kpi, expected run_sql)

## Q043 (medium, en, time_comparison) - wrong

**Question:** Difference in average delivery days between H1 2017 and H1 2018.

**Gold SQL:**
```sql
WITH h1_2017 AS (SELECT AVG(julianday(order_delivered_customer_date) - julianday(order_purchase_timestamp)) AS avg_days FROM orders WHERE order_status = 'delivered' AND order_delivered_customer_date IS NOT NULL AND order_delivered_customer_date >= order_purchase_timestamp AND order_purchase_timestamp >= '2017-01-01' AND order_purchase_timestamp < '2017-07-01'), h1_2018 AS (SELECT AVG(julianday(order_delivered_customer_date) - julianday(order_purchase_timestamp)) AS avg_days FROM orders WHERE order_status = 'delivered' AND order_delivered_customer_date IS NOT NULL AND order_delivered_customer_date >= order_purchase_timestamp AND order_purchase_timestamp >= '2018-01-01' AND order_purchase_timestamp < '2018-07-01') SELECT ROUND(h1_2018.avg_days - h1_2017.avg_days, 2) AS diff_days FROM h1_2017, h1_2018
```
**Predicted SQL:**
```sql
SELECT 'H1 2017' AS period, ROUND(AVG(julianday(order_delivered_customer_date) - julianday(order_purchase_timestamp)), 2) AS avg_delivery_days FROM orders WHERE order_status = 'delivered' AND order_delivered_customer_date IS NOT NULL AND order_delivered_customer_date >= order_purchase_timestamp AND order_purchase_timestamp >= '2017-01-01' AND order_purchase_timestamp < '2017-07-01' UNION ALL SELECT 'H1 2018' AS period, ROUND(AVG(julianday(order_delivered_customer_date) - julianday(order_purchase_timestamp)), 2) AS avg_delivery_days FROM orders WHERE order_status = 'delivered' AND order_delivered_customer_date IS NOT NULL AND order_delivered_customer_date >= order_purchase_timestamp AND order_purchase_timestamp >= '2018-01-01' AND order_purchase_timestamp < '2018-07-01'
LIMIT 100
```
**Gold result (first 3 rows):**
```json
[{"diff_days": 0.66}]
```
**Predicted result (first 3 rows):**
```json
[{"period": "H1 2017", "avg_delivery_days": 12.66}, {"period": "H1 2018", "avg_delivery_days": 13.32}]
```
**Error / note:** -

**Suggested classification:** different LIMIT / top-k

## Q046 (hard, vi, time_comparison) - wrong

**Question:** Doanh thu trung bình hàng ngày trong tháng 8 năm 2018 là bao nhiêu?

**Gold SQL:**
```sql
WITH daily AS (SELECT date(o.order_purchase_timestamp) AS day, SUM(oi.price) AS rev FROM orders o JOIN order_items oi ON o.order_id = oi.order_id WHERE o.order_status = 'delivered' AND o.order_purchase_timestamp >= '2018-08-01' AND o.order_purchase_timestamp < '2018-09-01' GROUP BY date(o.order_purchase_timestamp)) SELECT ROUND(AVG(rev), 2) AS avg_daily_revenue FROM daily
```
**Predicted SQL:**
```sql
SELECT ROUND(SUM(oi.price) / 31.0, 2) AS avg_daily_revenue FROM orders o JOIN order_items oi ON o.order_id = oi.order_id WHERE o.order_status = 'delivered' AND o.order_purchase_timestamp >= '2018-08-01' AND o.order_purchase_timestamp < '2018-09-01'
LIMIT 100
```
**Gold result (first 3 rows):**
```json
[{"avg_daily_revenue": 28916.44}]
```
**Predicted result (first 3 rows):**
```json
[{"avg_daily_revenue": 27050.86}]
```
**Error / note:** -

**Suggested classification:** different grouping; different LIMIT / top-k

## Q050 (hard, vi, window) - wrong

**Question:** Tìm người bán (top 1) có doanh thu cao nhất tại từng bang.

**Gold SQL:**
```sql
WITH seller_revenue AS (SELECT s.seller_state AS state, s.seller_id, SUM(oi.price) AS revenue FROM orders o JOIN order_items oi ON o.order_id = oi.order_id JOIN sellers s ON oi.seller_id = s.seller_id WHERE o.order_status = 'delivered' GROUP BY s.seller_state, s.seller_id), ranked_sellers AS (SELECT state, seller_id, revenue, ROW_NUMBER() OVER (PARTITION BY state ORDER BY revenue DESC, seller_id ASC) AS rn FROM seller_revenue) SELECT state, seller_id, ROUND(revenue, 2) AS revenue FROM ranked_sellers WHERE rn = 1 ORDER BY state ASC
```
**Predicted SQL:**
```sql
WITH seller_state_rev AS ( SELECT s.seller_state, s.seller_id, ROUND(SUM(oi.price), 2) AS revenue, ROW_NUMBER() OVER (PARTITION BY s.seller_state ORDER BY SUM(oi.price) DESC) AS rn FROM orders o JOIN order_items oi ON o.order_id = oi.order_id JOIN sellers s ON oi.seller_id = s.seller_id WHERE o.order_status = 'delivered' GROUP BY s.seller_state, s.seller_id ) SELECT seller_state, seller_id, revenue FROM seller_state_rev WHERE rn = 1 ORDER BY revenue DESC
LIMIT 100
```
**Gold result (first 3 rows):**
```json
[{"state": "AM", "seller_id": "327b89b872c14d1c0be7235ef4871685", "revenue": 1177.0}, {"state": "BA", "seller_id": "53243585a1d6dc2643021fd1853d8905", "revenue": 217940.44}, {"state": "CE", "seller_id": "bbf9ad41dca6603e614efcdad7aab8c4", "revenue": 7846.0}]
```
**Predicted result (first 3 rows):**
```json
[{"seller_state": "SP", "seller_id": "4869f7a5dfa277a7dca6462dcf3b52b2", "revenue": 226987.93}, {"seller_state": "BA", "seller_id": "53243585a1d6dc2643021fd1853d8905", "revenue": 217940.44}, {"seller_state": "RJ", "seller_id": "46dc3b2cc0980fb8ec44634e21d2718e", "revenue": 122811.38}]
```
**Error / note:** -

**Suggested classification:** different grouping; different LIMIT / top-k

## Q054 (medium, en, scoped) - wrong

**Question:** Average review score for sellers based in PR state.

**Gold SQL:**
```sql
SELECT ROUND(AVG(r.review_score), 2) AS avg_score FROM orders o JOIN order_items oi ON o.order_id = oi.order_id JOIN sellers s ON oi.seller_id = s.seller_id JOIN (SELECT order_id, review_score FROM (SELECT order_id, review_score, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY review_answer_timestamp DESC, review_id DESC) AS rn FROM order_reviews) WHERE rn = 1) r ON o.order_id = r.order_id WHERE o.order_status = 'delivered' AND s.seller_state = 'PR'
```
**Predicted SQL:**
```sql
WITH latest_review AS ( SELECT order_id, review_score FROM ( SELECT order_id, review_score, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY review_answer_timestamp DESC, review_id DESC) AS rn FROM order_reviews ) WHERE rn = 1 ) SELECT ROUND(AVG(r.review_score), 2) AS avg_score FROM orders o JOIN latest_review r ON o.order_id = r.order_id WHERE o.order_status = 'delivered' AND EXISTS ( SELECT 1 FROM order_items oi JOIN sellers s ON oi.seller_id = s.seller_id WHERE oi.order_id = o.order_id AND s.seller_state = 'PR' )
LIMIT 100
```
**Gold result (first 3 rows):**
```json
[{"avg_score": 4.13}]
```
**Predicted result (first 3 rows):**
```json
[{"avg_score": 4.18}]
```
**Error / note:** -

**Suggested classification:** different LIMIT / top-k

## Q056 (hard, en, scoped) - wrong

**Question:** Top 5 customer cities that bought the most 'auto' products.

**Gold SQL:**
```sql
SELECT c.customer_city AS city, COUNT(oi.order_item_id) AS auto_items_bought FROM orders o JOIN customers c ON o.customer_id = c.customer_id JOIN order_items oi ON o.order_id = oi.order_id JOIN products p ON oi.product_id = p.product_id WHERE o.order_status = 'delivered' AND p.product_category_name = 'auto' GROUP BY c.customer_city ORDER BY auto_items_bought DESC, city ASC LIMIT 5
```
**Predicted SQL:**
```sql
SELECT c.customer_city AS city, c.customer_state AS state, ROUND(SUM(oi.price), 2) AS revenue, COUNT(DISTINCT o.order_id) AS orders_count FROM orders o JOIN customers c ON o.customer_id = c.customer_id JOIN order_items oi ON o.order_id = oi.order_id JOIN products p ON oi.product_id = p.product_id WHERE o.order_status = 'delivered' AND p.product_category_name = 'auto' GROUP BY c.customer_city, c.customer_state ORDER BY revenue DESC LIMIT 5
```
**Gold result (first 3 rows):**
```json
[{"city": "sao paulo", "auto_items_bought": 545}, {"city": "rio de janeiro", "auto_items_bought": 192}, {"city": "brasilia", "auto_items_bought": 105}]
```
**Predicted result (first 3 rows):**
```json
[{"city": "sao paulo", "state": "SP", "revenue": 55982.62, "orders_count": 492}, {"city": "rio de janeiro", "state": "RJ", "revenue": 27813.33, "orders_count": 181}, {"city": "brasilia", "state": "DF", "revenue": 17159.54, "orders_count": 99}]
```
**Error / note:** -

**Suggested classification:** different grouping; DISTINCT mismatch in COUNT

## Q058 (hard, en, ambiguous) - no_sql

**Question:** Which product category is the worst?

**Gold SQL:**
```sql
SELECT p.product_category_name AS category, ROUND(SUM(oi.price), 2) AS revenue FROM orders o JOIN order_items oi ON o.order_id = oi.order_id JOIN products p ON oi.product_id = p.product_id WHERE o.order_status = 'delivered' AND p.product_category_name IS NOT NULL GROUP BY p.product_category_name ORDER BY revenue ASC, category ASC LIMIT 1
```
**Predicted SQL:**
```sql
(none)
```
**Gold result (first 3 rows):**
```json
[{"category": "security_and_services", "revenue": 283.29}]
```
**Predicted result (first 3 rows):**
```json
null
```
**Error / note:** -

**Suggested classification:** no SQL produced; wrong tool (used None, expected run_sql)

## Q059 (hard, en, ambiguous) - wrong

**Question:** Who are our most loyal customers?

**Gold SQL:**
```sql
SELECT c.customer_unique_id, COUNT(DISTINCT o.order_id) AS total_orders FROM orders o JOIN customers c ON o.customer_id = c.customer_id WHERE o.order_status = 'delivered' GROUP BY c.customer_unique_id ORDER BY total_orders DESC, c.customer_unique_id ASC LIMIT 10
```
**Predicted SQL:**
```sql
SELECT c.customer_unique_id, c.customer_state, c.customer_city, COUNT(DISTINCT o.order_id) AS delivered_orders, ROUND(SUM(oi.price), 2) AS total_spent FROM customers c JOIN orders o ON c.customer_id = o.customer_id JOIN order_items oi ON o.order_id = oi.order_id WHERE o.order_status = 'delivered' GROUP BY c.customer_unique_id, c.customer_state, c.customer_city ORDER BY delivered_orders DESC, total_spent DESC LIMIT 5
```
**Gold result (first 3 rows):**
```json
[{"customer_unique_id": "8d50f5eadf50201ccdcedfb9e2ac8455", "total_orders": 15}, {"customer_unique_id": "3e43e6105506432c953e165fb2acf44c", "total_orders": 9}, {"customer_unique_id": "1b6c7548a2a1f9037c1fd3ddfed95f33", "total_orders": 7}]
```
**Predicted result (first 3 rows):**
```json
[{"customer_unique_id": "8d50f5eadf50201ccdcedfb9e2ac8455", "customer_state": "SP", "customer_city": "sao paulo", "delivered_orders": 15, "total_spent": 714.63}, {"customer_unique_id": "3e43e6105506432c953e165fb2acf44c", "customer_state": "SP", "customer_city": "praia grande", "delivered_orders": 9, "total_spent": 1000.85}, {"customer_unique_id": "1b6c7548a2a1f9037c1fd3ddfed95f33", "customer_state": "MG", "customer_city": "ituiutaba", "delivered_orders": 7, "total_spent": 809.21}]
```
**Error / note:** -

**Suggested classification:** wrong table (pred ['customers', 'order_items', 'orders'], gold ['customers', 'orders']); different grouping; different LIMIT / top-k
