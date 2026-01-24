"use strict";
/**
 * SQL 安全工具函数
 * 用于防止 SQL 注入攻击
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSortParams = validateSortParams;
/**
 * 验证排序参数，防止 SQL 注入
 * @param sortBy 用户传入的排序字段
 * @param sortOrder 用户传入的排序方向
 * @param validColumns 允许排序的字段白名单
 * @param defaultColumn 默认排序字段
 * @returns 安全的排序字段和方向
 */
function validateSortParams(sortBy, sortOrder, validColumns, defaultColumn = 'id') {
    const sortColumn = validColumns.includes(sortBy) ? sortBy : defaultColumn;
    const order = sortOrder?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    return { sortColumn, order };
}
