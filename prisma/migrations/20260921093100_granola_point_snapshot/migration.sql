-- Classify every new receipt line at insertion, including orders placed by
-- the previous app version while the new deployment is rolling out.
CREATE FUNCTION club_snapshot_granola_bags() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  SELECT CASE WHEN p.category='GRANOLA' THEN NEW.quantity ELSE 0 END
    INTO NEW."granolaBags" FROM "Product" p WHERE p.id=NEW."productId";
  RETURN NEW;
END;
$$;
CREATE TRIGGER club_order_item_points BEFORE INSERT ON "OrderItem"
FOR EACH ROW EXECUTE FUNCTION club_snapshot_granola_bags();
