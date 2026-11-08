using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddVillageNameArAndImageUrl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "NameAr",
                table: "Zones",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "Villages",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NameAr",
                table: "Villages",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Properties_Status_VillageId_Price",
                table: "Properties",
                columns: new[] { "Status", "VillageId", "Price" });

            migrationBuilder.CreateIndex(
                name: "IX_Properties_VillageId_ZoneId",
                table: "Properties",
                columns: new[] { "VillageId", "ZoneId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Properties_Status_VillageId_Price",
                table: "Properties");

            migrationBuilder.DropIndex(
                name: "IX_Properties_VillageId_ZoneId",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "NameAr",
                table: "Zones");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "Villages");

            migrationBuilder.DropColumn(
                name: "NameAr",
                table: "Villages");
        }
    }
}
