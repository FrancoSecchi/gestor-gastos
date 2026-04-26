use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Transaction {
    pub id: String,
    pub r#type: String,
    pub amount: f64,
    pub amount_usd: Option<f64>,
    pub category: String,
    pub subcategory: Option<String>,
    pub description: Option<String>,
    pub date: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NewTransaction {
    pub r#type: String,
    pub amount: f64,
    pub amount_usd: Option<f64>,
    pub category: String,
    pub subcategory: Option<String>,
    pub description: Option<String>,
    pub date: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Summary {
    pub total_income: f64,
    pub total_expenses: f64,
    pub balance: f64,
    pub by_category: Vec<CategorySummary>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CategorySummary {
    pub category: String,
    pub total: f64,
    pub count: i64,
}
