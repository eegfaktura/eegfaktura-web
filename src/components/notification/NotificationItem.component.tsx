import React, {FC} from "react";
import {IonCard, IonCardContent, IonFooter, IonIcon} from "@ionic/react";
import {alertCircle, syncCircle} from "ionicons/icons";
import moment from "moment";
import {buildNotificationText} from "../../util/Notificaton.util";
import {EegNotification} from "../../models/eeg.model";
import {eegAssignmentTurnIn, eegEuro} from "../../eegIcons";

interface NotificationItemComponentProps {
  type: string
  process: string
  date: Date
  notification: object
}

const NotificationItemComponent: FC<NotificationItemComponentProps> = ({type, process, date, notification}) => {

  const getIcon = () => {
    switch (process) {
      case "EDA_PROCESS":
        const n = notification as EegNotification
        return <IonIcon className={`notification-icon_${type}`} icon={syncCircle} size="large"></IonIcon>
      case "EXCEL_IMPORT":
        return <IonIcon className={`notification-icon_${type}`} icon={eegAssignmentTurnIn} size="medium"></IonIcon>
      default:
        return <IonIcon style={{color: "yellow"}} icon={alertCircle} size="large"></IonIcon>
    }
  }

  const getProcessId = () => {
    switch (process) {
      case "EDA_PROCESS":
        const n = notification as EegNotification
        return n.message.type
    }
    return process
  }

  return (
    <div className="notification-item">
      <IonCard>
        <IonCardContent>
          <div style={{display: "grid", gridTemplateColumns:"5% 95%"}}>
            {getIcon()}
            <div>{buildNotificationText(type, process, notification)}</div>

          </div>
        </IonCardContent>
        <IonFooter>
          <div style={{display: "flex", flexFlow: "row", columnGap: "24px", alignItems: "center"}}>
            <div className="notification-date">{moment(date).format("dd, MMM Do YYYY, h:mm:ss")}</div>
            <div>{getProcessId()}</div>
          </div>
        </IonFooter>
      </IonCard>
    </div>
  )
}

export default NotificationItemComponent;