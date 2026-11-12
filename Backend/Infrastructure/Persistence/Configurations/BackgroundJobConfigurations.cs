using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public sealed class ScheduledJobRecordConfiguration : IEntityTypeConfiguration<ScheduledJobRecord>
{
    public void Configure(EntityTypeBuilder<ScheduledJobRecord> b)
    {
        b.Property(x => x.EntityType).HasMaxLength(64).IsRequired();
        b.Property(x => x.JobType).HasMaxLength(64).IsRequired();
        b.Property(x => x.HangfireJobId).HasMaxLength(128).IsRequired();

        b.HasIndex(x => new { x.EntityType, x.EntityId, x.IsCancelled, x.IsExecuted });
        b.HasIndex(x => x.HangfireJobId);
    }
}

public sealed class JobDispatchLogConfiguration : IEntityTypeConfiguration<JobDispatchLog>
{
    public void Configure(EntityTypeBuilder<JobDispatchLog> b)
    {
        b.Property(x => x.DispatchKey).HasMaxLength(200).IsRequired();
        b.Property(x => x.Category).HasMaxLength(64).IsRequired();
        b.Property(x => x.Status).HasMaxLength(32).IsRequired();
        b.Property(x => x.LastError).HasMaxLength(2000);

        b.HasIndex(x => x.DispatchKey).IsUnique();
        b.HasIndex(x => new { x.Category, x.Status });
    }
}

