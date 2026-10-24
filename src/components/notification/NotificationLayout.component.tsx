import {FC} from "react";
import NotificationItemComponent from "./NotificationItem.component";
import {EegNotification} from "../../models/eeg.model";

import "./NotificationLayout.component.scss"

interface NotificationLayoutComponentProps {
  notifications: Array<{type: string, process: string, date: Date, notification: object}>
}

const NotificationLayoutComponent: FC<NotificationLayoutComponentProps> = ({notifications}) => {

  return (
    <div className={"notification-main"}>
      {/* the id keeps the state of a card (e.g. a data check) with its notification when the list is reloaded */}
      {notifications.map(n => (
        <NotificationItemComponent key={(n.notification as EegNotification).id} type={n.type} process={n.process} date={n.date} notification={n.notification}/>
      ))}
    </div>
  )
}

export default NotificationLayoutComponent