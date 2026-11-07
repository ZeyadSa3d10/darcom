using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddNorthCoastVillagesAndBrokerWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Properties_Locations_LocationId",
                table: "Properties");

            migrationBuilder.AlterColumn<int>(
                name: "LocationId",
                table: "Properties",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<string>(
                name: "BuildingNumber",
                table: "Properties",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CreatedByUserId",
                table: "Properties",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VillageId",
                table: "Properties",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ZoneId",
                table: "Properties",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EndDate",
                table: "BookingRequests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BrokerProfiles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    AgencyName = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    LicenseNumber = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    NationalId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    DocumentUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    AdminNotes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BrokerProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BrokerProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RentalPeriods",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PropertyId = table.Column<int>(type: "int", nullable: false),
                    BookingRequestId = table.Column<int>(type: "int", nullable: true),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RenterName = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    RenterPhone = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RentalPeriods", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RentalPeriods_BookingRequests_BookingRequestId",
                        column: x => x.BookingRequestId,
                        principalTable: "BookingRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_RentalPeriods_Properties_PropertyId",
                        column: x => x.PropertyId,
                        principalTable: "Properties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Villages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Villages", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "Villages",
                columns: new[] { "Id", "Name", "Slug", "IsActive", "CreatedAt", "UpdatedAt" },
                values: new object[,]
                {
                    { 1, "Marassi", "marassi", true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { 2, "Hacienda Bay", "hacienda-bay", true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { 3, "Telal", "telal", true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { 4, "Amwaj", "amwaj", true, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null }
                });

            migrationBuilder.Sql("UPDATE Properties SET VillageId = 1 WHERE VillageId = 0;");

            migrationBuilder.CreateTable(
                name: "BrokerPropertyRequests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BrokerId = table.Column<int>(type: "int", nullable: false),
                    PropertyId = table.Column<int>(type: "int", nullable: false),
                    ClientName = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    ClientPhone = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Purpose = table.Column<int>(type: "int", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    BrokerProfileId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BrokerPropertyRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BrokerPropertyRequests_BrokerProfiles_BrokerProfileId",
                        column: x => x.BrokerProfileId,
                        principalTable: "BrokerProfiles",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BrokerPropertyRequests_Properties_PropertyId",
                        column: x => x.PropertyId,
                        principalTable: "Properties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BrokerPropertyRequests_Users_BrokerId",
                        column: x => x.BrokerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Zones",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    VillageId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Zones", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Zones_Villages_VillageId",
                        column: x => x.VillageId,
                        principalTable: "Villages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PropertyRequirements",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: true),
                    CustomerName = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    CustomerEmail = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CustomerPhone = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Purpose = table.Column<int>(type: "int", nullable: false),
                    PropertyTypeId = table.Column<int>(type: "int", nullable: true),
                    VillageId = table.Column<int>(type: "int", nullable: true),
                    ZoneId = table.Column<int>(type: "int", nullable: true),
                    MinPrice = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    MaxPrice = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    Bedrooms = table.Column<int>(type: "int", nullable: true),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DesiredAmenities = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(3000)", maxLength: 3000, nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    AssignedStaffId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PropertyRequirements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PropertyRequirements_PropertyTypes_PropertyTypeId",
                        column: x => x.PropertyTypeId,
                        principalTable: "PropertyTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PropertyRequirements_Users_AssignedStaffId",
                        column: x => x.AssignedStaffId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PropertyRequirements_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PropertyRequirements_Villages_VillageId",
                        column: x => x.VillageId,
                        principalTable: "Villages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PropertyRequirements_Zones_ZoneId",
                        column: x => x.ZoneId,
                        principalTable: "Zones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "Roles",
                columns: new[] { "Id", "CreatedAt", "Description", "Name", "UpdatedAt" },
                values: new object[] { 5, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "External real estate broker submitting client requests.", "Broker", null });

            migrationBuilder.CreateIndex(
                name: "IX_Properties_CreatedByUserId",
                table: "Properties",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Properties_Status_Purpose_VillageId",
                table: "Properties",
                columns: new[] { "Status", "Purpose", "VillageId" });

            migrationBuilder.CreateIndex(
                name: "IX_Properties_VillageId",
                table: "Properties",
                column: "VillageId");

            migrationBuilder.CreateIndex(
                name: "IX_Properties_ZoneId",
                table: "Properties",
                column: "ZoneId");

            migrationBuilder.CreateIndex(
                name: "IX_BookingRequests_PropertyId",
                table: "BookingRequests",
                column: "PropertyId");

            migrationBuilder.CreateIndex(
                name: "IX_BrokerProfiles_Status",
                table: "BrokerProfiles",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_BrokerProfiles_UserId",
                table: "BrokerProfiles",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BrokerPropertyRequests_BrokerId",
                table: "BrokerPropertyRequests",
                column: "BrokerId");

            migrationBuilder.CreateIndex(
                name: "IX_BrokerPropertyRequests_BrokerProfileId",
                table: "BrokerPropertyRequests",
                column: "BrokerProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_BrokerPropertyRequests_PropertyId",
                table: "BrokerPropertyRequests",
                column: "PropertyId");

            migrationBuilder.CreateIndex(
                name: "IX_BrokerPropertyRequests_Status",
                table: "BrokerPropertyRequests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_PropertyRequirements_AssignedStaffId",
                table: "PropertyRequirements",
                column: "AssignedStaffId");

            migrationBuilder.CreateIndex(
                name: "IX_PropertyRequirements_CreatedAt",
                table: "PropertyRequirements",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_PropertyRequirements_PropertyTypeId",
                table: "PropertyRequirements",
                column: "PropertyTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_PropertyRequirements_Status",
                table: "PropertyRequirements",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_PropertyRequirements_UserId",
                table: "PropertyRequirements",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PropertyRequirements_VillageId",
                table: "PropertyRequirements",
                column: "VillageId");

            migrationBuilder.CreateIndex(
                name: "IX_PropertyRequirements_ZoneId",
                table: "PropertyRequirements",
                column: "ZoneId");

            migrationBuilder.CreateIndex(
                name: "IX_RentalPeriods_BookingRequestId",
                table: "RentalPeriods",
                column: "BookingRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_RentalPeriods_PropertyId",
                table: "RentalPeriods",
                column: "PropertyId");

            migrationBuilder.CreateIndex(
                name: "IX_RentalPeriods_PropertyId_StartDate_EndDate",
                table: "RentalPeriods",
                columns: new[] { "PropertyId", "StartDate", "EndDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Villages_IsActive",
                table: "Villages",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Villages_Slug",
                table: "Villages",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Zones_VillageId",
                table: "Zones",
                column: "VillageId");

            migrationBuilder.CreateIndex(
                name: "IX_Zones_VillageId_Slug",
                table: "Zones",
                columns: new[] { "VillageId", "Slug" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Properties_Locations_LocationId",
                table: "Properties",
                column: "LocationId",
                principalTable: "Locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Properties_Users_CreatedByUserId",
                table: "Properties",
                column: "CreatedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Properties_Villages_VillageId",
                table: "Properties",
                column: "VillageId",
                principalTable: "Villages",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Properties_Zones_ZoneId",
                table: "Properties",
                column: "ZoneId",
                principalTable: "Zones",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Properties_Locations_LocationId",
                table: "Properties");

            migrationBuilder.DropForeignKey(
                name: "FK_Properties_Users_CreatedByUserId",
                table: "Properties");

            migrationBuilder.DropForeignKey(
                name: "FK_Properties_Villages_VillageId",
                table: "Properties");

            migrationBuilder.DropForeignKey(
                name: "FK_Properties_Zones_ZoneId",
                table: "Properties");

            migrationBuilder.DropTable(
                name: "BrokerPropertyRequests");

            migrationBuilder.DropTable(
                name: "PropertyRequirements");

            migrationBuilder.DropTable(
                name: "RentalPeriods");

            migrationBuilder.DropTable(
                name: "BrokerProfiles");

            migrationBuilder.DropTable(
                name: "Zones");

            migrationBuilder.DropTable(
                name: "Villages");

            migrationBuilder.DropIndex(
                name: "IX_Properties_CreatedByUserId",
                table: "Properties");

            migrationBuilder.DropIndex(
                name: "IX_Properties_Status_Purpose_VillageId",
                table: "Properties");

            migrationBuilder.DropIndex(
                name: "IX_Properties_VillageId",
                table: "Properties");

            migrationBuilder.DropIndex(
                name: "IX_Properties_ZoneId",
                table: "Properties");

            migrationBuilder.DropIndex(
                name: "IX_BookingRequests_PropertyId",
                table: "BookingRequests");

            migrationBuilder.DeleteData(
                table: "Roles",
                keyColumn: "Id",
                keyValue: 5);

            migrationBuilder.DropColumn(
                name: "BuildingNumber",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "VillageId",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "ZoneId",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "EndDate",
                table: "BookingRequests");

            migrationBuilder.AlterColumn<int>(
                name: "LocationId",
                table: "Properties",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Properties_Locations_LocationId",
                table: "Properties",
                column: "LocationId",
                principalTable: "Locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
