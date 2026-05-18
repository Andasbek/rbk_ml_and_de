-- INSERTs для core.branches
SET search_path TO core;
TRUNCATE branches RESTART IDENTITY CASCADE;
INSERT INTO branches(branch_id,branch_code,branch_name,city,address,opened_date,is_active) VALUES
(1,'BR0001','Astana филиал 1','Astana','ул. Восточная, д. 4 стр. 22','2010-04-13',TRUE),
(2,'BR0002','Aktobe филиал 2','Aktobe','бул. Базарный, д. 1/1 стр. 933','2012-09-30',TRUE),
(3,'BR0003','Karaganda филиал 3','Karaganda','ул. Выгонная, д. 4/8 стр. 1','2011-07-26',TRUE),
(4,'BR0004','Astana филиал 4','Astana','бул. Челюскинцев, д. 5','2017-08-03',TRUE),
(5,'BR0005','Semey филиал 5','Semey','алл. Луначарского, д. 216','2010-12-23',TRUE),
(6,'BR0006','Atyrau филиал 6','Atyrau','ш. Чайковского, д. 1 к. 9/2','2014-09-25',TRUE),
(7,'BR0007','Almaty филиал 7','Almaty','ул. Кирова, д. 4 к. 503','2010-05-03',TRUE),
(8,'BR0008','Astana филиал 8','Astana','ш. Лесозаводское, д. 864','2012-06-14',TRUE),
(9,'BR0009','Karaganda филиал 9','Karaganda','ш. Радищева, д. 65 стр. 24','2015-09-01',TRUE),
(10,'BR0010','Atyrau филиал 10','Atyrau','бул. Ярославский, д. 82 стр. 5/9','2010-04-19',TRUE);
