# Order Allocation System (Full-Stack)

A mini Order Allocation System built using **Node.js (Express)**, **Next.js (App Router)**, and **PostgreSQL (Raw SQL)**. It demonstrates safe stock allocation under highly concurrent request scenarios without overselling.

---

## 🚀 Setup Instructions

### Prerequisites
*   **Node.js** (v18+ recommended)
*   **PostgreSQL** database running locally (on port 5432)

---

### 1. Database Setup
1. Ensure your PostgreSQL server is active.
2. In the `backend` folder, check the `.env` file to ensure the database connection string and username/password match your environment:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://postgres:SQT%40123@localhost:5432/order_allocation
   JWT_SECRET=supersecretjwtkey_please_change_in_production
   ```
3. Initialize the database by creating the `order_allocation` database first (if not already created):
   ```bash
   cd backend
   node create_db.js
   ```
4. Setup tables, schemas, constraints, and indexes:
   ```bash
   node src/db/init.js
   ```

---

### 2. Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the backend development server (starts on `http://localhost:5000`):
   ```bash
   npm run dev
   ```

---

### 3. Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Next.js development server (starts on `http://localhost:3000` or `http://localhost:3001` depending on port availability):
   ```bash
   npm run dev
   ```

---

## 🗄️ Schema Explanation

The system defines four relational tables inside PostgreSQL using standard raw SQL constraints and types:

1.  **`users`**: Represents registered buyers.
    *   `id`: `SERIAL PRIMARY KEY`.
    *   `name`: `VARCHAR(255) NOT NULL`.
    *   `email`: `VARCHAR(255) UNIQUE NOT NULL` (enforces email singularity, indexed implicitly).
    *   `password`: `VARCHAR(255) NOT NULL` (hashed using bcrypt).
    *   `created_at`: `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`.

2.  **`products`**: Catalog of items.
    *   `id`: `SERIAL PRIMARY KEY`.
    *   `name`: `VARCHAR(255) NOT NULL`.
    *   `price`: `DECIMAL(10, 2) NOT NULL CHECK (price >= 0)`.
    *   `stock`: `INTEGER NOT NULL CHECK (stock >= 0)` (strict database-level constraint ensuring stock can never drop below 0).
    *   `deleted_at`: `TIMESTAMP` for soft delete (Bonus).

3.  **`orders`**: Overall purchase records.
    *   `id`: `SERIAL PRIMARY KEY`.
    *   `user_id`: `INTEGER REFERENCES users(id)` (references the purchasing user).
    *   `total_price`: `DECIMAL(10, 2) NOT NULL` (calculated on the backend).
    *   `status`: `order_status` (`ENUM('PENDING', 'COMPLETED', 'CANCELLED')` with default `'COMPLETED'`).
    *   `created_at`: `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`.

4.  **`order_items`**: Line items inside each order.
    *   `id`: `SERIAL PRIMARY KEY`.
    *   `order_id`: `INTEGER REFERENCES orders(id) ON DELETE CASCADE`.
    *   `product_id`: `INTEGER REFERENCES products(id)`.
    *   `quantity`: `INTEGER NOT NULL CHECK (quantity > 0)`.
    *   `price`: `DECIMAL(10, 2) NOT NULL` (safeguards purchase price integrity from future product price changes).

---

## ⚡ Concurrency Explanation

### Problem Scenario
Two users concurrently attempt to purchase the last 5 units of a product. If request validation and stock updates are done concurrently without locking (i.e. Read-Then-Write), both transactions might read a stock of 5, pass the validation, and decrement stock. This results in **negative stock** (overselling), causing data inconsistency.

### Solution Design
Our solution uses **Database Transactions** combined with **Row-Level Locking (`SELECT ... FOR UPDATE`)**:

1.  **Atomic Transaction**: In the `POST /orders` endpoint, we run all SQL statements within a single transaction (`BEGIN` ... `COMMIT`).
2.  **Row Locking**: We query the target product inside the transaction using:
    ```sql
    SELECT id, name, price, stock FROM products WHERE id = $1 FOR UPDATE
    ```
    This instructs PostgreSQL to acquire an exclusive write lock on that product's database row.
3.  **Blocking Queue**:
    *   If User A's transaction reaches this point first, it acquires the lock.
    *   When User B's transaction attempts to select the same product, PostgreSQL pauses User B and puts them in a queue until User A's transaction concludes (`COMMIT` or `ROLLBACK`).
4.  **Sequential Execution**:
    *   User A checks the stock (5), finds it sufficient, decrements it by 3, inserts the order, and commits.
    *   User A's lock is released.
    *   User B's transaction resumes. It reads the fresh product stock, which is now **2**.
    *   User B's request wants 3 units. Since stock (2) < requested (3), validation fails, the transaction rolls back (`ROLLBACK`), and User B receives an "Insufficient stock" error.
5.  **Order Cancellation**: The same lock logic is applied in `PATCH /orders/:id/cancel` to lock both the order row and product rows, preventing double cancellations and race conditions when restoring stock.

---

## 📈 Indexing Strategy

To optimize database read operations under heavy lookup volumes, we explicitly created the following indexes:

*   **`users(email)`**: Automatically created via the `UNIQUE` constraint. Crucial for O(1) lookups during signup and login requests.
*   **`orders(user_id)`**: Added to optimize the `GET /orders` endpoint, which retrieves all orders belonging to the logged-in user. Without this index, listing a user's orders would require a full table scan of the `orders` table.
*   **`orders(created_at)`**: Added to accelerate paginated order lists sorted by date (`ORDER BY created_at DESC`).
*   **`order_items(order_id)`**: Added to speed up joins or selections retrieving all line items for specific orders.

---

## 🧠 Assumptions Made

1.  **Authentication**: Simple JWT token-based authentication. Expiry is set to 1 hour, and the authenticated user's ID is extracted from the token (rather than accepting it from the request body) for order security.
2.  **Order Status**: Orders are processed and assumed paid immediately for simple simulation, defaulting to `COMPLETED`. They can then be transitioned to `CANCELLED`.
3.  **Product Seeding**: Admin operations (adding new products, deleting products) are accessible directly via the marketplace's frontend toolbar to ease system demonstration.
4.  **Pagination**: Page size is set to 5 on the orders page. Calculations are completed entirely inside SQL using `LIMIT` and `OFFSET` coupled with a separate count query to determine pagination totals efficiently.
5.  **Rate Limiting**: Applied on the order placement route restricting users to a maximum of 5 requests per minute.
