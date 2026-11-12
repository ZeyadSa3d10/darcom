using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddHangfireJobTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "JobDispatchLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DispatchKey = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    AttemptCount = table.Column<int>(type: "int", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastError = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobDispatchLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ScheduledJobRecords",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EntityType = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    EntityId = table.Column<int>(type: "int", nullable: false),
                    JobType = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    HangfireJobId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    ScheduledForUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsCancelled = table.Column<bool>(type: "bit", nullable: false),
                    IsExecuted = table.Column<bool>(type: "bit", nullable: false),
                    ExecutedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CancelledAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScheduledJobRecords", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_JobDispatchLogs_Category_Status",
                table: "JobDispatchLogs",
                columns: new[] { "Category", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_JobDispatchLogs_DispatchKey",
                table: "JobDispatchLogs",
                column: "DispatchKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ScheduledJobRecords_EntityType_EntityId_IsCancelled_IsExecuted",
                table: "ScheduledJobRecords",
                columns: new[] { "EntityType", "EntityId", "IsCancelled", "IsExecuted" });

            migrationBuilder.CreateIndex(
                name: "IX_ScheduledJobRecords_HangfireJobId",
                table: "ScheduledJobRecords",
                column: "HangfireJobId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "JobDispatchLogs");

            migrationBuilder.DropTable(
                name: "ScheduledJobRecords");
        }
    }
}
