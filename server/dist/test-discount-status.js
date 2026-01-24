"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("./config/database"));
// 测试减免金额后缴费状态判断逻辑
async function testDiscountStatus() {
    console.log('========================================');
    console.log('测试：减免金额后缴费状态判断');
    console.log('========================================\n');
    const connection = await database_1.default.getConnection();
    try {
        await connection.beginTransaction();
        // 测试场景1: 何芳芳案例 - 合同1800, 实收1600, 减免200 -> 应为"已缴费"
        console.log('【测试场景1】何芳芳案例');
        console.log('合同金额: 1800, 实收金额: 1600, 减免金额: 200');
        console.log('预期结果: 缴费状态="已缴费", 欠费金额=0\n');
        const contractAmount1 = 1800;
        const actualAmount1 = 1600;
        const discountAmount1 = 200;
        const debtAmount1 = contractAmount1 - actualAmount1 - discountAmount1;
        let paymentStatus1 = '未缴费';
        let enrollmentStatus1 = '报名未缴费';
        if (actualAmount1 + discountAmount1 >= contractAmount1) {
            paymentStatus1 = '已缴费';
            enrollmentStatus1 = '报名已缴费';
        }
        else if (actualAmount1 + discountAmount1 > 0) {
            paymentStatus1 = '部分缴费';
            enrollmentStatus1 = '报名部分缴费';
        }
        console.log(`✓ 计算结果: 欠费金额=${debtAmount1}, 缴费状态=${paymentStatus1}, 报名状态=${enrollmentStatus1}`);
        console.log(`✓ 判断条件: ${actualAmount1} + ${discountAmount1} = ${actualAmount1 + discountAmount1} >= ${contractAmount1} ? ${actualAmount1 + discountAmount1 >= contractAmount1}`);
        if (paymentStatus1 === '已缴费' && debtAmount1 === 0) {
            console.log('✅ 测试场景1通过\n');
        }
        else {
            console.log('❌ 测试场景1失败\n');
        }
        // 测试场景2: 部分缴费 - 合同2000, 实收1000, 减免300 -> 应为"部分缴费"
        console.log('【测试场景2】部分缴费');
        console.log('合同金额: 2000, 实收金额: 1000, 减免金额: 300');
        console.log('预期结果: 缴费状态="部分缴费", 欠费金额=700\n');
        const contractAmount2 = 2000;
        const actualAmount2 = 1000;
        const discountAmount2 = 300;
        const debtAmount2 = contractAmount2 - actualAmount2 - discountAmount2;
        let paymentStatus2 = '未缴费';
        let enrollmentStatus2 = '报名未缴费';
        if (actualAmount2 + discountAmount2 >= contractAmount2) {
            paymentStatus2 = '已缴费';
            enrollmentStatus2 = '报名已缴费';
        }
        else if (actualAmount2 + discountAmount2 > 0) {
            paymentStatus2 = '部分缴费';
            enrollmentStatus2 = '报名部分缴费';
        }
        console.log(`✓ 计算结果: 欠费金额=${debtAmount2}, 缴费状态=${paymentStatus2}, 报名状态=${enrollmentStatus2}`);
        console.log(`✓ 判断条件: ${actualAmount2} + ${discountAmount2} = ${actualAmount2 + discountAmount2} < ${contractAmount2} ? ${actualAmount2 + discountAmount2 < contractAmount2}`);
        if (paymentStatus2 === '部分缴费' && debtAmount2 === 700) {
            console.log('✅ 测试场景2通过\n');
        }
        else {
            console.log('❌ 测试场景2失败\n');
        }
        // 测试场景3: 全减免 - 合同1500, 实收0, 减免1500 -> 应为"已缴费"
        console.log('【测试场景3】全额减免');
        console.log('合同金额: 1500, 实收金额: 0, 减免金额: 1500');
        console.log('预期结果: 缴费状态="已缴费", 欠费金额=0\n');
        const contractAmount3 = 1500;
        const actualAmount3 = 0;
        const discountAmount3 = 1500;
        const debtAmount3 = contractAmount3 - actualAmount3 - discountAmount3;
        let paymentStatus3 = '未缴费';
        let enrollmentStatus3 = '报名未缴费';
        if (actualAmount3 + discountAmount3 >= contractAmount3) {
            paymentStatus3 = '已缴费';
            enrollmentStatus3 = '报名已缴费';
        }
        else if (actualAmount3 + discountAmount3 > 0) {
            paymentStatus3 = '部分缴费';
            enrollmentStatus3 = '报名部分缴费';
        }
        console.log(`✓ 计算结果: 欠费金额=${debtAmount3}, 缴费状态=${paymentStatus3}, 报名状态=${enrollmentStatus3}`);
        console.log(`✓ 判断条件: ${actualAmount3} + ${discountAmount3} = ${actualAmount3 + discountAmount3} >= ${contractAmount3} ? ${actualAmount3 + discountAmount3 >= contractAmount3}`);
        if (paymentStatus3 === '已缴费' && debtAmount3 === 0) {
            console.log('✅ 测试场景3通过\n');
        }
        else {
            console.log('❌ 测试场景3失败\n');
        }
        // 测试场景4: 无减免正常缴费 - 合同1800, 实收1800, 减免0 -> 应为"已缴费"
        console.log('【测试场景4】无减免正常缴费');
        console.log('合同金额: 1800, 实收金额: 1800, 减免金额: 0');
        console.log('预期结果: 缴费状态="已缴费", 欠费金额=0\n');
        const contractAmount4 = 1800;
        const actualAmount4 = 1800;
        const discountAmount4 = 0;
        const debtAmount4 = contractAmount4 - actualAmount4 - discountAmount4;
        let paymentStatus4 = '未缴费';
        let enrollmentStatus4 = '报名未缴费';
        if (actualAmount4 + discountAmount4 >= contractAmount4) {
            paymentStatus4 = '已缴费';
            enrollmentStatus4 = '报名已缴费';
        }
        else if (actualAmount4 + discountAmount4 > 0) {
            paymentStatus4 = '部分缴费';
            enrollmentStatus4 = '报名部分缴费';
        }
        console.log(`✓ 计算结果: 欠费金额=${debtAmount4}, 缴费状态=${paymentStatus4}, 报名状态=${enrollmentStatus4}`);
        console.log(`✓ 判断条件: ${actualAmount4} + ${discountAmount4} = ${actualAmount4 + discountAmount4} >= ${contractAmount4} ? ${actualAmount4 + discountAmount4 >= contractAmount4}`);
        if (paymentStatus4 === '已缴费' && debtAmount4 === 0) {
            console.log('✅ 测试场景4通过\n');
        }
        else {
            console.log('❌ 测试场景4失败\n');
        }
        // 测试场景5: 边界条件 - 合同2000, 实收1999, 减免0 -> 应为"部分缴费"
        console.log('【测试场景5】边界条件测试');
        console.log('合同金额: 2000, 实收金额: 1999, 减免金额: 0');
        console.log('预期结果: 缴费状态="部分缴费", 欠费金额=1\n');
        const contractAmount5 = 2000;
        const actualAmount5 = 1999;
        const discountAmount5 = 0;
        const debtAmount5 = contractAmount5 - actualAmount5 - discountAmount5;
        let paymentStatus5 = '未缴费';
        let enrollmentStatus5 = '报名未缴费';
        if (actualAmount5 + discountAmount5 >= contractAmount5) {
            paymentStatus5 = '已缴费';
            enrollmentStatus5 = '报名已缴费';
        }
        else if (actualAmount5 + discountAmount5 > 0) {
            paymentStatus5 = '部分缴费';
            enrollmentStatus5 = '报名部分缴费';
        }
        console.log(`✓ 计算结果: 欠费金额=${debtAmount5}, 缴费状态=${paymentStatus5}, 报名状态=${enrollmentStatus5}`);
        console.log(`✓ 判断条件: ${actualAmount5} + ${discountAmount5} = ${actualAmount5 + discountAmount5} < ${contractAmount5} ? ${actualAmount5 + discountAmount5 < contractAmount5}`);
        if (paymentStatus5 === '部分缴费' && debtAmount5 === 1) {
            console.log('✅ 测试场景5通过\n');
        }
        else {
            console.log('❌ 测试场景5失败\n');
        }
        // 测试场景6: 超额支付 - 合同1800, 实收2000, 减免0 -> 应为"已缴费"
        console.log('【测试场景6】超额支付');
        console.log('合同金额: 1800, 实收金额: 2000, 减免金额: 0');
        console.log('预期结果: 缴费状态="已缴费", 欠费金额=-200\n');
        const contractAmount6 = 1800;
        const actualAmount6 = 2000;
        const discountAmount6 = 0;
        const debtAmount6 = contractAmount6 - actualAmount6 - discountAmount6;
        let paymentStatus6 = '未缴费';
        let enrollmentStatus6 = '报名未缴费';
        if (actualAmount6 + discountAmount6 >= contractAmount6) {
            paymentStatus6 = '已缴费';
            enrollmentStatus6 = '报名已缴费';
        }
        else if (actualAmount6 + discountAmount6 > 0) {
            paymentStatus6 = '部分缴费';
            enrollmentStatus6 = '报名部分缴费';
        }
        console.log(`✓ 计算结果: 欠费金额=${debtAmount6}, 缴费状态=${paymentStatus6}, 报名状态=${enrollmentStatus6}`);
        console.log(`✓ 判断条件: ${actualAmount6} + ${discountAmount6} = ${actualAmount6 + discountAmount6} >= ${contractAmount6} ? ${actualAmount6 + discountAmount6 >= contractAmount6}`);
        if (paymentStatus6 === '已缴费' && debtAmount6 === -200) {
            console.log('✅ 测试场景6通过\n');
        }
        else {
            console.log('❌ 测试场景6失败\n');
        }
        await connection.rollback();
        console.log('========================================');
        console.log('所有测试场景执行完成！');
        console.log('========================================\n');
        console.log('📊 测试总结:');
        console.log('新公式: 欠费金额 = 合同金额 - 实收金额 - 减免金额');
        console.log('判断逻辑: if (实收金额 + 减免金额 >= 合同金额) => 已缴费');
        console.log('         else if (实收金额 + 减免金额 > 0) => 部分缴费');
        console.log('         else => 未缴费');
    }
    catch (error) {
        await connection.rollback();
        console.error('测试执行失败:', error);
        throw error;
    }
    finally {
        connection.release();
        await database_1.default.end();
    }
}
// 运行测试
testDiscountStatus().catch(console.error);
