using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRequestDedupeIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_BookingRequests_PropertyId",
                table: "BookingRequests");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequests_PropertyId_BuyerId_Status",
                table: "PurchaseRequests",
                columns: new[] { "PropertyId", "BuyerId", "Status" },
                unique: true,
                filter: "[Status] IN (0, 1, 2, 3)");

            migrationBuilder.CreateIndex(
                name: "IX_BookingRequests_PropertyId_RenterId_Status",
                table: "BookingRequests",
                columns: new[] { "PropertyId", "RenterId", "Status" },
                unique: true,
                filter: "[Status] IN (0, 1, 2, 3)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PurchaseRequests_PropertyId_BuyerId_Status",
                table: "PurchaseRequests");

            migrationBuilder.DropIndex(
                name: "IX_BookingRequests_PropertyId_RenterId_Status",
                table: "BookingRequests");

            migrationBuilder.CreateIndex(
                name: "IX_BookingRequests_PropertyId",
                table: "BookingRequests",
                column: "PropertyId");
        }
    }
}
