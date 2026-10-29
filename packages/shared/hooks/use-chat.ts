import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockApiClient } from "../mock-api-client";

export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: () => mockApiClient.getConversations(),
  });
}

export function useMessages(conversationId: string, before?: string) {
  return useQuery({
    queryKey: ["messages", conversationId, before],
    queryFn: () => mockApiClient.getMessages(conversationId, before),
    enabled: !!conversationId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, data }: { conversationId: string; data: Parameters<typeof mockApiClient.sendMessage>[1] }) =>
      mockApiClient.sendMessage(conversationId, data),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
