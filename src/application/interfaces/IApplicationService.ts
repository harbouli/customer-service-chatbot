export interface IApplicationService<TRequest, TResponse> {
  execute(request: TRequest): Promise<TResponse>;
}
