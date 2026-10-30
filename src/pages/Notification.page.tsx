import React, {FC, useCallback, useEffect, useRef, useState} from "react";
import {
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonMenuButton,
  IonPage,
  IonToolbar,
  useIonViewWillEnter,
  useIonViewWillLeave
} from "@ionic/react";
import {EegNotification, Message} from "../models/eeg.model";
import {useAppDispatch, useAppSelector} from "../store";
import {ErrorState, selectedTenant, setErrorState} from "../store/eeg";
import NotificationLayoutComponent from "../components/notification/NotificationLayout.component";
import {Api} from "../service";
import {useTenant} from "../store/hook/Eeg.provider";
import {hasLiveEntry} from "../components/notification/EnergyRequestSummary.functions";

// a running energy request is loaded again this often while it is shown
export const LIVE_REFRESH_MS = 60000


const NotificationPage: FC = () => {
  const {tenant} = useTenant()
  const [notifictions, setNotifications] = useState<{type: string, process: string, date: Date, notification: EegNotification}[]>([])

  // only the answer of the latest load counts: an older one (e.g. of the community before a switch) is dropped
  const loadSeq = useRef(0)
  const loadFailed = useRef(false)
  const dispatch = useAppDispatch()
  const load = useCallback(() => {
    if (!tenant) return
    const seq = ++loadSeq.current
    Api.eegService.getNotifications(tenant, 0).then(r => {
      if (seq !== loadSeq.current) return
      loadFailed.current = false
      setNotifications(r.map(x => {
        x.message = new Message(x.message)
        return {type: x.type, process: x.process, date: x.date, notification: x}
      }))
    }).catch((e: unknown) => {
      // through the global error toast, once until a load works again (the poll would repeat it every minute)
      if (seq !== loadSeq.current || loadFailed.current) return
      loadFailed.current = true
      const reason = e instanceof Error && e.message ? ` (${e.message})` : ""
      dispatch(setErrorState({message: `Die Nachrichten konnten nicht geladen werden.${reason}`} as ErrorState))
    })
  }, [tenant, dispatch])

  // Ionic keeps the page mounted when switching views: load again on every visit (a new energy request summary
  // or answers would otherwise only show after a page reload) and when the community changes.
  // another community: its list starts empty and its first failure is reported (never the old community's list)
  useEffect(() => {
    setNotifications([])
    loadFailed.current = false
  }, [tenant])
  useEffect(() => load(), [load])
  useIonViewWillEnter(() => load(), [load])

  // A running energy request (live entry) shows its current state: load again every minute while one is shown
  // and the page is visible, and once when the browser tab becomes visible again.
  const [visible, setVisible] = useState(true)
  useIonViewWillEnter(() => setVisible(true))
  useIonViewWillLeave(() => setVisible(false))
  const live = hasLiveEntry(notifictions.map(n => n.notification))
  useEffect(() => {
    if (!live || !visible) return
    const timer = setInterval(() => { if (!document.hidden) load() }, LIVE_REFRESH_MS)
    const onVisible = () => { if (!document.hidden) load() }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [live, visible, load])

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          {/* opens the side menu below 992 px, hidden while the menu is shown beside the page (261024-ca9) */}
          <IonButtons slot="start" className="ion-hide-lg-up">
            <IonMenuButton/>
          </IonButtons>
          <div style={{paddingLeft: "16px"}}><h3>Nachrichten</h3></div>
        </IonToolbar>
      </IonHeader>
      <IonContent color="eeg">
        {/*<div className="">*/}
        {/*{notifictions.map((n,i) => (*/}
        {/*  <IonItem key={n.id*i} style={{justifyItems: "space-between"}}>*/}
        {/*    /!*<div key={n.id*i} style={{display: "flex", width: "100%", justifyContent:"space-between"}}>*!/*/}
        {/*    <div key={n.id*i} style={{display: "grid", width: "100%", gridTemplateColumns: "20% auto 30% 20%"}}>*/}
        {/*      <div>{n.date}</div>*/}
        {/*      <div>{n.message.meteringPoint}</div>*/}
        {/*      <div>{n.message.responseCode}</div>*/}
        {/*      <div>{n.message.type}</div>*/}
        {/*    </div>*/}
        {/*  </IonItem>*/}
        {/*))}*/}
        {/*</div>*/}
        <NotificationLayoutComponent notifications={notifictions}/>
      </IonContent>
    </IonPage>
  )
}

export default NotificationPage;