# **AIt**

Hey there! I'm _AIt_, Mateo's personal assistant

## **Overview**

### **Features**

- **Connectors**: Modular connectors for platforms like GitHub and Spotify, with OAuth 2.0 for secure authentication.
- **Data Normalization**: Unified data structure for seamless data integration and analysis.
- **Scalable Architecture**: Designed to add new connectors and features with ease.
- **ETL Process**: Streamlined pipeline for data extraction, transformation, and loading.
- **Data Storage**: PostgreSQL for structured storage and a vector database for semantic queries.

## **Prerequisites**

**Install Dependencies**:

Ensure `pnpm` is installed:

```bash
corepack enable
```

Install all dependencies:

```bash
pnpm install
```

**Docker Services**:

Use Docker to run supporting services like PostgreSQL:

```bash
pnpm start:services
```

## **Testing**

Run unit and integration tests:

```bash
pnpm test
```

## **Linting**

Check code quality:
```bash
pnpm lint
```

Automatically fix linting issues:
```bash
pnpm lint:fix
```

## **Data Flow**

### **Steps**

1. **Collect Data**: Fetch data using connectors (e.g., GitHub, Spotify).
2. **Store in PostgreSQL**: Save raw and normalized data for reliability.
3. **Run ETL**: Transform and clean the data for advanced querying.
4. **Vector Database**: Use a vector database for semantic and contextual searches.

---

## **License**

[MIT](LICENSE)
