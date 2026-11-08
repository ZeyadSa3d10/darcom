using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPropertyListingRequestWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PropertyListingRequestId",
                table: "Properties",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PropertyListingRequests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RequestNumber = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    VillageId = table.Column<int>(type: "int", nullable: false),
                    ZoneId = table.Column<int>(type: "int", nullable: false),
                    BuildingNumber = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    UnitNumber = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    AdminNotes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    InspectionDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AssignedAdminId = table.Column<int>(type: "int", nullable: true),
                    PropertyId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PropertyListingRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PropertyListingRequests_Properties_PropertyId",
                        column: x => x.PropertyId,
                        principalTable: "Properties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PropertyListingRequests_Users_AssignedAdminId",
                        column: x => x.AssignedAdminId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PropertyListingRequests_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PropertyListingRequests_Villages_VillageId",
                        column: x => x.VillageId,
                        principalTable: "Villages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PropertyListingRequests_Zones_ZoneId",
                        column: x => x.ZoneId,
                        principalTable: "Zones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Properties_PropertyListingRequestId",
                table: "Properties",
                column: "PropertyListingRequestId",
                unique: true,
                filter: "[PropertyListingRequestId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PropertyListingRequests_AssignedAdminId",
                table: "PropertyListingRequests",
                column: "AssignedAdminId");

            migrationBuilder.CreateIndex(
                name: "IX_PropertyListingRequests_PropertyId",
                table: "PropertyListingRequests",
                column: "PropertyId");

            migrationBuilder.CreateIndex(
                name: "IX_PropertyListingRequests_RequestNumber",
                table: "PropertyListingRequests",
                column: "RequestNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PropertyListingRequests_Status",
                table: "PropertyListingRequests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_PropertyListingRequests_UserId",
                table: "PropertyListingRequests",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PropertyListingRequests_VillageId",
                table: "PropertyListingRequests",
                column: "VillageId");

            migrationBuilder.CreateIndex(
                name: "IX_PropertyListingRequests_VillageId_BuildingNumber_UnitNumber",
                table: "PropertyListingRequests",
                columns: new[] { "VillageId", "BuildingNumber", "UnitNumber" });

            migrationBuilder.CreateIndex(
                name: "IX_PropertyListingRequests_ZoneId",
                table: "PropertyListingRequests",
                column: "ZoneId");

            migrationBuilder.AddForeignKey(
                name: "FK_Properties_PropertyListingRequests_PropertyListingRequestId",
                table: "Properties",
                column: "PropertyListingRequestId",
                principalTable: "PropertyListingRequests",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Properties_PropertyListingRequests_PropertyListingRequestId",
                table: "Properties");

            migrationBuilder.DropTable(
                name: "PropertyListingRequests");

            migrationBuilder.DropIndex(
                name: "IX_Properties_PropertyListingRequestId",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "PropertyListingRequestId",
                table: "Properties");
        }
    }
}
