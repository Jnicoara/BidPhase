-- Split "Panels & Breakers" into "Panels" and "Breakers".
--
-- Generated as a bare MODIFY COLUMN, which would have dropped the old enum
-- value while rows still held it — MySQL turns those into '' rather than
-- failing, so every panel and breaker would have quietly lost its shelf.
--
-- Widen to varchar, re-shelve the rows, then narrow onto the new enum.
-- Baseline rows would have self-healed on the next boot (seedBaselineMaterials
-- re-stamps category), but user FORKS carry their own category and are never
-- re-stamped — they are the rows this exists for.

ALTER TABLE `materials` MODIFY COLUMN `category` varchar(64);--> statement-breakpoint

-- Anything called a breaker is one. This covers "20A breaker", "20/2 breaker",
-- the tandems and the AFCI/GFCI units in one pass.
UPDATE `materials`
   SET `category` = 'Breakers'
 WHERE `category` = 'Panels & Breakers'
   AND LOWER(`name`) LIKE '%breaker%';--> statement-breakpoint

-- The remainder is service equipment: panels, sub-panels, meter bases,
-- disconnects and fuses. A fuse goes in a fused disconnect, not a load center.
UPDATE `materials`
   SET `category` = 'Panels'
 WHERE `category` = 'Panels & Breakers';--> statement-breakpoint

ALTER TABLE `materials` MODIFY COLUMN `category` enum('Wire & Cable','Conduit','Conduit Fittings','Boxes','Receptacles','Switches','Wall Plates & Misc','Panels','Breakers','Lighting Hardware','Grounding & Bonding','Life Safety','Low Voltage','Connectors & Terminations','Strut & Supports','Fasteners & Anchors','Equipment & Appliances','Distribution Equipment','Consumables');
