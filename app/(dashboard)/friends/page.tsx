import { getCurrentUserRecord } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import FriendsBoard from '@/components/friends/FriendsBoard'

// Layout 已經處理了認證和初始化檢查
export default async function FriendsPage() {
  const userRecord = await getCurrentUserRecord()
  if (!userRecord) {
    return null
  }

  // Fetch friends list
  const friendships = await prisma.friend.findMany({
    where: {
      AND: [
        { status: 'accepted' },
        {
          OR: [
            { userId: userRecord.id },
            { friendId: userRecord.id },
          ],
        },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          userID: true,
          name: true,
          image: true,
        },
      },
      friend: {
        select: {
          id: true,
          email: true,
          userID: true,
          name: true,
          image: true,
        },
      },
    },
  })

  // Map to friend objects
  const friends = friendships.map((friendship) => {
    const friendUser = friendship.userId === userRecord.id
      ? friendship.friend
      : friendship.user
    return {
      id: friendUser.id,
      email: friendUser.email,
      userID: friendUser.userID,
      name: friendUser.name,
      image: friendUser.image,
      friendshipId: friendship.id,
    }
  })

  return <FriendsBoard initialFriends={friends} />
}
