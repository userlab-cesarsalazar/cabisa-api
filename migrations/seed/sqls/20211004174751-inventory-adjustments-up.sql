-- INVETORY_ADJUSTMENTS
INSERT INTO inventory_adjustments (operation_id,adjustment_reason,created_at,created_by) VALUES
	 (8,'Ajuste de prueba','2021-10-04 12:45:26',5);

-- INVETORY_ADJUSTMENTS_PRODUCTS
INSERT INTO inventory_adjustments_products (inventory_adjustment_id,product_id,preview_stock,next_stock) VALUES
	 (1,6,3,4),
	 (1,5,6,5);