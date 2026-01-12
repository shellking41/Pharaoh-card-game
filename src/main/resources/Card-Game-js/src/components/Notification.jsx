import React from 'react';
import { MdErrorOutline } from 'react-icons/md';
import { GrStatusGood } from 'react-icons/gr';
import { IoWarningOutline } from 'react-icons/io5';
import styles from './styles/NotificationStyle.module.css';

function Notification({ message, type }) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <GrStatusGood className={styles.icon}/>;
      case 'warning':
        return <IoWarningOutline className={styles.icon}/>;
      case 'error':
        return <MdErrorOutline className={styles.icon}/>;
      default:
        return null;
    }
  };

  const getNotificationClass = () => {
    return `${styles.notification} ${styles[type] || ''}`;
  };

  return (
    <div className={getNotificationClass()}>
      <div className={styles.iconWrapper}>
        {getIcon()}
      </div>
      <div className={styles.content}>
        <p className={styles.message}>{message}</p>
      </div>
    </div>
  );
}

export default Notification;