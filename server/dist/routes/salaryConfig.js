"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const router = (0, express_1.Router)();
// 获取工资配置列表
router.get('/', async (req, res) => {
    try {
        const { limit = 50, offset = 0, config_type, keyword } = req.query;
        let query = 'SELECT * FROM salary_config WHERE 1=1';
        const params = [];
        // 筛选条件
        if (config_type) {
            query += ' AND config_type = ?';
            params.push(config_type);
        }
        if (keyword) {
            query += ' AND (config_name LIKE ? OR remarks LIKE ?)';
            params.push(`%${keyword}%`, `%${keyword}%`);
        }
        // 排序
        query += ' ORDER BY effective_date DESC, id DESC';
        // 获取总数
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
        const [countResult] = await database_1.default.query(countQuery, params);
        const total = countResult[0].total;
        // 分页
        query += ' LIMIT ? OFFSET ?';
        params.push(Number(limit), Number(offset));
        const [rows] = await database_1.default.query(query, params);
        res.json({
            success: true,
            data: {
                list: rows,
                pagination: {
                    total,
                    limit: Number(limit),
                    offset: Number(offset)
                }
            }
        });
    }
    catch (error) {
        console.error('获取工资配置列表失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
});
// 获取当前有效的工资配置
router.get('/current', async (req, res) => {
    try {
        const { month } = req.query; // YYYY-MM格式
        const targetDate = month ? `${month}-01` : new Date().toISOString().split('T')[0];
        const query = `
      SELECT * FROM salary_config 
      WHERE effective_date <= ? 
        AND (expiry_date IS NULL OR expiry_date >= ?)
      ORDER BY effective_date DESC
    `;
        const [rows] = await database_1.default.query(query, [targetDate, targetDate]);
        // 按配置类型分组，取最新的配置
        const configMap = new Map();
        rows.forEach((row) => {
            if (!configMap.has(row.config_type)) {
                configMap.set(row.config_type, row);
            }
        });
        const currentConfig = Array.from(configMap.values());
        res.json({
            success: true,
            data: currentConfig
        });
    }
    catch (error) {
        console.error('获取当前有效配置失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
});
// 创建工资配置
router.post('/', async (req, res) => {
    try {
        const { config_name, config_type, amount, effective_date, expiry_date, remarks } = req.body;
        // 验证必填字段
        if (!config_name || !config_type || amount === undefined || !effective_date) {
            return res.status(400).json({
                success: false,
                message: '配置名称、配置类型、金额和生效日期为必填项'
            });
        }
        const query = `
      INSERT INTO salary_config 
      (config_name, config_type, amount, effective_date, expiry_date, remarks)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
        const [result] = await database_1.default.query(query, [
            config_name,
            config_type,
            amount,
            effective_date,
            expiry_date || null,
            remarks || null
        ]);
        res.json({
            success: true,
            data: { id: result.insertId },
            message: '工资配置创建成功'
        });
    }
    catch (error) {
        console.error('创建工资配置失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
});
// 更新工资配置
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { config_name, config_type, amount, effective_date, expiry_date, remarks } = req.body;
        const query = `
      UPDATE salary_config 
      SET config_name = ?, config_type = ?, amount = ?, 
          effective_date = ?, expiry_date = ?, remarks = ?
      WHERE id = ?
    `;
        await database_1.default.query(query, [
            config_name,
            config_type,
            amount,
            effective_date,
            expiry_date || null,
            remarks || null,
            id
        ]);
        res.json({
            success: true,
            message: '工资配置更新成功'
        });
    }
    catch (error) {
        console.error('更新工资配置失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
});
// 删除工资配置
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await database_1.default.query('DELETE FROM salary_config WHERE id = ?', [id]);
        res.json({
            success: true,
            message: '工资配置删除成功'
        });
    }
    catch (error) {
        console.error('删除工资配置失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
});
exports.default = router;
