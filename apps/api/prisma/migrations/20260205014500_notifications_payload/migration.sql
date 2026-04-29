ALTER TABLE "Notification"
ADD COLUMN "propertyId" UUID;

CREATE INDEX "Notification_propertyId_idx" ON "Notification"("propertyId");

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
