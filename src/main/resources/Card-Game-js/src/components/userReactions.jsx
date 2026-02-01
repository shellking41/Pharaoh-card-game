import React, { useEffect, useState } from 'react';
import { useApiCallHook } from '../hooks/useApiCallHook';
import { useContext } from 'react';
import { TokenContext } from '../Contexts/TokenContext';
import styles from './styles/UserReactions.module.css';
import { UserContext } from '../Contexts/UserContext.jsx';

function UserReactions({ userId, like: initialLike, dislike: initialDislike }) {
  const { post } = useApiCallHook();
  const { token } = useContext(TokenContext);
  const { userCurrentStatus } = useContext(UserContext);

  const [likeCount, setLikeCount] = useState(initialLike);
  const [dislikeCount, setDislikeCount] = useState(initialDislike);
  const [currentReaction, setCurrentReaction] = useState(null); // 'LIKE', 'DISLIKE', or null

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLikeCount(initialLike);
    setDislikeCount(initialDislike);
  }, [initialLike, initialDislike]);
  const handleReaction = async (reaction) => {
    if (loading) {
      return;
    }

    setLoading(true);
    try {
      const response = await post(
        'http://localhost:8080/user/react-to-user',
        {
          userId: userId,
          reaction: reaction,
        },
        token,
      );

      if (response) {
        // Update the counts from the server response
        setLikeCount(response.likeCount);
        setDislikeCount(response.dislikeCount);
        setCurrentReaction(response.currentReaction);

        // Log the action for debugging
        console.log(`Reaction ${response.action}: ${reaction} on user ${userId}`);
      }
    } catch (error) {
      console.error('Failed to react:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.reactionsContainer}>
      <button
        onClick={() => handleReaction('LIKE')}
        disabled={loading || userCurrentStatus?.userInfo?.userId === userId}
        className={`${styles.reactionButton} ${
          currentReaction === 'LIKE' ? styles.active : ''
        }`}
        title={currentReaction === 'LIKE' ? 'Remove like' : 'Like this user'}
      >
        👍 <span className={styles.count}>{likeCount}</span>
      </button>

      <button
        onClick={() => handleReaction('DISLIKE')}
        disabled={loading || userCurrentStatus?.userInfo?.userId === userId}
        className={`${styles.reactionButton} ${
          currentReaction === 'DISLIKE' ? styles.active : ''
        }`}
        title={currentReaction === 'DISLIKE' ? 'Remove dislike' : 'Dislike this user'}
      >
        👎 <span className={styles.count}>{dislikeCount}</span>
      </button>
    </div>
  );
}

export default UserReactions;