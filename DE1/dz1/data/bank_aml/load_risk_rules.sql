-- INSERTs для aml.risk_rules
SET search_path TO aml;
TRUNCATE risk_rules RESTART IDENTITY CASCADE;
INSERT INTO risk_rules(rule_id,rule_code,rule_name,severity,description,is_active) VALUES
(1,'RULE_LARGE_AMT','Крупная сумма (>10М тг)','high','Транзакция выше 10 000 000 KZT',TRUE),
(2,'RULE_RAPID_MOVEMENT','Серия быстрых переводов','medium','≥5 транзакций за 10 минут',TRUE),
(3,'RULE_HIGH_RISK_CTR','Контрагент в high-risk стране','high','Перевод в санкционные юрисдикции',TRUE),
(4,'RULE_NIGHT_HOURS','Транзакции ночью','low','Между 00:00 и 05:00',TRUE),
(5,'RULE_NEW_CUST_BIG','Крупная сумма у нового клиента','high','Клиент <30 дней + сумма >1М',TRUE),
(6,'RULE_GAMBLING','MCC 7995 (gambling)','medium','Авторизация в gambling-категории',TRUE),
(7,'RULE_ATM_BURST','Серия снятий в банкомате','medium','≥3 ATM снятия за час',TRUE),
(8,'RULE_DORMANT_WAKE','Пробуждение спящего счёта','medium','Счёт без операций >180 дней',TRUE),
(9,'RULE_ROUND_AMT','Подозрительно круглая сумма','low','Сумма кратна 100 000',TRUE),
(10,'RULE_SAME_DEV_MULTI','Одно устройство — много клиентов','high','≥3 customer_id на одном device',TRUE),
(11,'RULE_FAILED_LOGIN','Серия неудачных входов','medium','≥5 fail логинов за 10 минут',TRUE),
(12,'RULE_VELOCITY','Высокая скорость по карте','high','Авторизации в разных городах <1ч',TRUE),
(13,'RULE_STRUCTURING','Структурирование','high','Дробление крупной суммы',TRUE),
(14,'RULE_PEP','Politically Exposed Person','high','Клиент в PEP-списке',TRUE),
(15,'RULE_FOREIGN_FX','Подозрительный FX','medium','Конверсия >50К USD/день',TRUE);
