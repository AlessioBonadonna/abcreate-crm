-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "openingHours" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "source" TEXT NOT NULL,
    "enrichedVia" TEXT,
    "isChain" BOOLEAN NOT NULL DEFAULT false,
    "dedupKey" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "hasHttps" BOOLEAN NOT NULL DEFAULT false,
    "pageTitle" TEXT,
    "metaDescription" TEXT,
    "hasWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "hasGoogleMaps" BOOLEAN NOT NULL DEFAULT false,
    "hasContactForm" BOOLEAN NOT NULL DEFAULT false,
    "hasContactPage" BOOLEAN NOT NULL DEFAULT false,
    "hasEmailOnSite" BOOLEAN NOT NULL DEFAULT false,
    "hasPhoneOnSite" BOOLEAN NOT NULL DEFAULT false,
    "hasSocialLinks" BOOLEAN NOT NULL DEFAULT false,
    "textLength" INTEGER NOT NULL DEFAULT 0,
    "loadError" TEXT,
    "analyzedAt" DATETIME,
    "opportunityScore" INTEGER NOT NULL DEFAULT 0,
    "priority" TEXT NOT NULL DEFAULT 'LOW',
    "detectedProblems" TEXT,
    "segment" TEXT,
    "suggestedMessage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Da contattare',
    "channel" TEXT,
    "nextFollowUp" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SearchRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cities" TEXT NOT NULL,
    "categories" TEXT NOT NULL,
    "totalFound" INTEGER NOT NULL DEFAULT 0,
    "newLeads" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'running',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "segment" TEXT,
    "channel" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_dedupKey_key" ON "Lead"("dedupKey");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_city_idx" ON "Lead"("city");

-- CreateIndex
CREATE INDEX "Lead_category_idx" ON "Lead"("category");

-- CreateIndex
CREATE INDEX "Lead_priority_idx" ON "Lead"("priority");

-- CreateIndex
CREATE INDEX "Activity_leadId_idx" ON "Activity"("leadId");
