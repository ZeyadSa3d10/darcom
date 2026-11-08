using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCompleteBrokerRedesignWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Area",
                table: "PropertyRequirements",
                type: "decimal(10,2)",
                precision: 10,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BrokerId",
                table: "Properties",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BrokerSubmissionId",
                table: "Properties",
                type: "int",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ClientPhone",
                table: "BrokerPropertyRequests",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(32)",
                oldMaxLength: 32);

            migrationBuilder.AlterColumn<string>(
                name: "ClientName",
                table: "BrokerPropertyRequests",
                type: "nvarchar(160)",
                maxLength: 160,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(160)",
                oldMaxLength: 160);

            migrationBuilder.AlterColumn<string>(
                name: "LicenseNumber",
                table: "BrokerProfiles",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<string>(
                name: "AgencyName",
                table: "BrokerProfiles",
                type: "nvarchar(160)",
                maxLength: 160,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(160)",
                oldMaxLength: 160);

            migrationBuilder.AddColumn<string>(
                name: "IdCardBackPath",
                table: "BrokerProfiles",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IdCardFrontPath",
                table: "BrokerProfiles",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsPhoneVerified",
                table: "BrokerProfiles",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "BrokerPropertySubmissions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BrokerId = table.Column<int>(type: "int", nullable: false),
                    VillageId = table.Column<int>(type: "int", nullable: false),
                    ZoneId = table.Column<int>(type: "int", nullable: true),
                    Area = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    UnitNumber = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    AdminNotes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    BrokerProfileId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BrokerPropertySubmissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BrokerPropertySubmissions_BrokerProfiles_BrokerProfileId",
                        column: x => x.BrokerProfileId,
                        principalTable: "BrokerProfiles",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BrokerPropertySubmissions_Users_BrokerId",
                        column: x => x.BrokerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BrokerPropertySubmissions_Villages_VillageId",
                        column: x => x.VillageId,
                        principalTable: "Villages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BrokerPropertySubmissions_Zones_ZoneId",
                        column: x => x.ZoneId,
                        principalTable: "Zones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Properties_BrokerId",
                table: "Properties",
                column: "BrokerId");

            migrationBuilder.CreateIndex(
                name: "IX_Properties_BrokerSubmissionId",
                table: "Properties",
                column: "BrokerSubmissionId",
                unique: true,
                filter: "[BrokerSubmissionId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_BrokerPropertySubmissions_BrokerId",
                table: "BrokerPropertySubmissions",
                column: "BrokerId");

            migrationBuilder.CreateIndex(
                name: "IX_BrokerPropertySubmissions_BrokerProfileId",
                table: "BrokerPropertySubmissions",
                column: "BrokerProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_BrokerPropertySubmissions_Status",
                table: "BrokerPropertySubmissions",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_BrokerPropertySubmissions_VillageId",
                table: "BrokerPropertySubmissions",
                column: "VillageId");

            migrationBuilder.CreateIndex(
                name: "IX_BrokerPropertySubmissions_ZoneId",
                table: "BrokerPropertySubmissions",
                column: "ZoneId");

            migrationBuilder.AddForeignKey(
                name: "FK_Properties_BrokerPropertySubmissions_BrokerSubmissionId",
                table: "Properties",
                column: "BrokerSubmissionId",
                principalTable: "BrokerPropertySubmissions",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Properties_Users_BrokerId",
                table: "Properties",
                column: "BrokerId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Properties_BrokerPropertySubmissions_BrokerSubmissionId",
                table: "Properties");

            migrationBuilder.DropForeignKey(
                name: "FK_Properties_Users_BrokerId",
                table: "Properties");

            migrationBuilder.DropTable(
                name: "BrokerPropertySubmissions");

            migrationBuilder.DropIndex(
                name: "IX_Properties_BrokerId",
                table: "Properties");

            migrationBuilder.DropIndex(
                name: "IX_Properties_BrokerSubmissionId",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "Area",
                table: "PropertyRequirements");

            migrationBuilder.DropColumn(
                name: "BrokerId",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "BrokerSubmissionId",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "IdCardBackPath",
                table: "BrokerProfiles");

            migrationBuilder.DropColumn(
                name: "IdCardFrontPath",
                table: "BrokerProfiles");

            migrationBuilder.DropColumn(
                name: "IsPhoneVerified",
                table: "BrokerProfiles");

            migrationBuilder.AlterColumn<string>(
                name: "ClientPhone",
                table: "BrokerPropertyRequests",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(32)",
                oldMaxLength: 32,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ClientName",
                table: "BrokerPropertyRequests",
                type: "nvarchar(160)",
                maxLength: 160,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(160)",
                oldMaxLength: 160,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "LicenseNumber",
                table: "BrokerProfiles",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "AgencyName",
                table: "BrokerProfiles",
                type: "nvarchar(160)",
                maxLength: 160,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(160)",
                oldMaxLength: 160,
                oldNullable: true);
        }
    }
}
