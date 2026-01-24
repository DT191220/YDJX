"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("./config/database"));
async function verifyPriceHistoryTable() {
    try {
        console.log('正在验证价格历史表...');
        // 检查表是否存在
        const [tables] = await database_1.default.query("SHOW TABLES LIKE 'class_type_price_history'");
        if (tables.length === 0) {
            console.error('❌ 错误：class_type_price_history 表不存在');
            console.log('\n请执行以下SQL脚本创建表：');
            console.log('YDJX/database/create_price_history_table.sql');
            process.exit(1);
        }
        console.log('✅ class_type_price_history 表已存在');
        // 检查表结构
        const [columns] = await database_1.default.query("DESCRIBE class_type_price_history");
        console.log('\n表结构：');
        console.table(columns);
        // 检查现有数据
        const [records] = await database_1.default.query(`SELECT 
        ct.id,
        ct.name,
        ct.contract_amount as current_price,
        COUNT(ph.id) as history_count,
        MIN(ph.effective_date) as earliest_price_date
       FROM class_types ct
       LEFT JOIN class_type_price_history ph ON ct.id = ph.class_type_id
       GROUP BY ct.id, ct.name, ct.contract_amount`);
        console.log('\n班型价格历史统计：');
        console.table(records);
        // 检查是否所有班型都有历史记录
        const missingHistory = records.filter(r => r.history_count === 0);
        if (missingHistory.length > 0) {
            console.warn('\n⚠️  警告：以下班型缺少价格历史记录：');
            console.table(missingHistory);
            console.log('\n请执行数据迁移脚本：');
            console.log('YDJX/database/migrate_price_history.sql');
        }
        else {
            console.log('\n✅ 所有班型都有价格历史记录');
        }
        console.log('\n验证完成！');
        process.exit(0);
    }
    catch (error) {
        console.error('验证失败:', error);
        process.exit(1);
    }
}
verifyPriceHistoryTable();
