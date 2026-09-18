-- Cup day: the heat draw, the judges' wave scores and the public live
-- leaderboard for Cup Vol. 02. Organisers draw rounds of heats (round 1 by
-- age, later rounds shuffled, one final), judges sign in by email and score
-- waves per kid per heat, and the leaderboard adds the best two waves per heat.

-- CreateTable
CREATE TABLE "cup_event" (
    "edition" TEXT NOT NULL,
    "rounds" INTEGER NOT NULL DEFAULT 2,
    "heat_size" INTEGER NOT NULL DEFAULT 4,
    "final_size" INTEGER NOT NULL DEFAULT 4,
    "live" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cup_event_pkey" PRIMARY KEY ("edition"),
    CONSTRAINT "cup_event_rounds" CHECK ("rounds" BETWEEN 1 AND 6),
    CONSTRAINT "cup_event_heat_size" CHECK ("heat_size" BETWEEN 2 AND 4),
    CONSTRAINT "cup_event_final_size" CHECK ("final_size" BETWEEN 2 AND 4)
);

-- CreateTable
CREATE TABLE "cup_heat" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "edition" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'round',
    "round" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cup_heat_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cup_heat_stage" CHECK ("stage" IN ('round', 'final')),
    CONSTRAINT "cup_heat_status" CHECK ("status" IN ('scheduled', 'running', 'done')),
    CONSTRAINT "cup_heat_round" CHECK ("round" >= 0 AND "number" >= 1)
);

-- CreateTable
CREATE TABLE "cup_heat_slot" (
    "heat_id" UUID NOT NULL,
    "kid_id" UUID NOT NULL,
    "colour" TEXT NOT NULL,

    CONSTRAINT "cup_heat_slot_pkey" PRIMARY KEY ("heat_id","kid_id"),
    CONSTRAINT "cup_heat_slot_rashie" CHECK ("colour" IN ('red', 'yellow', 'blue', 'green'))
);

-- CreateTable
CREATE TABLE "cup_judge" (
    "edition" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "cup_judge_pkey" PRIMARY KEY ("edition","email")
);

-- CreateTable
CREATE TABLE "cup_wave" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "heat_id" UUID NOT NULL,
    "kid_id" UUID NOT NULL,
    "judge_email" TEXT NOT NULL,
    "wave" INTEGER NOT NULL,
    "score" DECIMAL(3,1) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cup_wave_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cup_wave_score" CHECK ("score" >= 0 AND "score" <= 10),
    CONSTRAINT "cup_wave_number" CHECK ("wave" >= 1)
);

-- CreateTable
CREATE TABLE "cup_ticker" (
    "id" BIGSERIAL NOT NULL,
    "edition" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'note',
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cup_ticker_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cup_ticker_kind" CHECK ("kind" IN ('note', 'heat', 'result'))
);

-- CreateIndex
CREATE UNIQUE INDEX "cup_heat_position" ON "cup_heat"("edition", "stage", "round", "number");

-- CreateIndex
CREATE UNIQUE INDEX "cup_heat_slot_colour" ON "cup_heat_slot"("heat_id", "colour");

-- CreateIndex
CREATE INDEX "cup_wave_heat_judge" ON "cup_wave"("heat_id", "judge_email");

-- CreateIndex
CREATE UNIQUE INDEX "cup_wave_once" ON "cup_wave"("heat_id", "kid_id", "judge_email", "wave");

-- CreateIndex
CREATE INDEX "cup_ticker_edition" ON "cup_ticker"("edition", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "cup_heat" ADD CONSTRAINT "cup_heat_edition_fkey" FOREIGN KEY ("edition") REFERENCES "cup_event"("edition") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cup_heat_slot" ADD CONSTRAINT "cup_heat_slot_heat_id_fkey" FOREIGN KEY ("heat_id") REFERENCES "cup_heat"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cup_heat_slot" ADD CONSTRAINT "cup_heat_slot_kid_id_fkey" FOREIGN KEY ("kid_id") REFERENCES "club_kid"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cup_judge" ADD CONSTRAINT "cup_judge_edition_fkey" FOREIGN KEY ("edition") REFERENCES "cup_event"("edition") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cup_wave" ADD CONSTRAINT "cup_wave_heat_id_fkey" FOREIGN KEY ("heat_id") REFERENCES "cup_heat"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cup_wave" ADD CONSTRAINT "cup_wave_kid_id_fkey" FOREIGN KEY ("kid_id") REFERENCES "club_kid"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cup_ticker" ADD CONSTRAINT "cup_ticker_edition_fkey" FOREIGN KEY ("edition") REFERENCES "cup_event"("edition") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Cup Vol. 02 starts drawn as two rounds of heats of four plus a final of four,
-- with the leaderboard private until an organiser switches it live.
INSERT INTO "cup_event" ("edition") VALUES ('cup-vol-2') ON CONFLICT ("edition") DO NOTHING;
