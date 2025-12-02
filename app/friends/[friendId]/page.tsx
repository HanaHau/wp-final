import FriendPetContent from '@/components/friends/FriendPetContent'

export default function FriendPetPage({
  params,
}: {
  params: { friendId: string }
}) {
  return <FriendPetContent friendId={params.friendId} />
}


