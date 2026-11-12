using MediatR;

namespace Application.Common.Messaging;

public interface ICommand<TResponse> : IRequest<ServiceResult<TResponse>>
{
}

public interface IQuery<TResponse> : IRequest<ServiceResult<TResponse>>
{
}

