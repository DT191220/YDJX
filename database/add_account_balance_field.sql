SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 添加账户余额字段到students表
ALTER TABLE students 
ADD COLUMN account_balance DECIMAL(10,2) DEFAULT 0.00 COMMENT '账户余额（学员多付或减免后的可用余额）' 
AFTER discount_amount;

-- 将现有的负债务转换为账户余额
UPDATE students 
SET account_balance = ABS(debt_amount),
    debt_amount = 0
WHERE debt_amount < 0;
