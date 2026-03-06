import {FC} from "react";
import NotificationItemComponent from "./NotificationItem.component";

import "./NotificationLayout.component.scss"

interface NotificationLayoutComponentProps {
  notifications: Array<{type: string, process: string, date: Date, notification: object}>
}

const NotificationLayoutComponent: FC<NotificationLayoutComponentProps> = ({notifications}) => {

  return (
    <div className={"notification-main"}>
      {notifications.map((n, idx) => (
        <NotificationItemComponent key={idx} type={n.type} process={n.process} date={n.date} notification={n.notification}/>
      ))}
    </div>
  )
}

export default NotificationLayoutComponent