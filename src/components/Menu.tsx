import {
  createAnimation, IonAvatar, IonButton,
  IonButtons, IonChip,
  IonContent, IonFooter, IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuToggle, IonModal, IonPopover, IonSelect, IonSelectOption,
  IonTitle,
  IonToolbar, SelectCustomEvent, useIonPopover,
} from '@ionic/react';

import {useLocation} from 'react-router-dom';
import {
  informationCircle, logOutOutline, newspaper,
  people, personCircle, refreshOutline, wallet, walletSharp
} from 'ionicons/icons';
import './Menu.css';
import React, {FC, useEffect, useRef, useState} from "react";
import {eegAvatar, eegChartBubble, eegChatIcon, eegProcess} from "../eegIcons";
import {useAppSelector} from "../store";
import {eegSelector} from "../store/eeg";
import {useAccessGroups, useTenant, useTenantDescription, useTenantSwitch} from "../store/hook/Eeg.provider";
import {useUser} from "../store/hook/AuthProvider";
import {AuthService} from "../service/auth.service";
import {User} from "oidc-client-ts";
import {useAuth} from "react-oidc-context";
import {useLocale} from "../store/hook/useLocale";

// const UserDetailPopover = (logout: () => Promise<void>, user: User) =>
const UserDetailPopover:FC<{authSvc: AuthService | undefined}> = ({authSvc}) => {
  const {t} = useLocale("common")
  const [user, setUser] = useState<User|null>()
  const [sortedTenants, setSortedTenants] = useState<{tenant: string, name: string}[] | undefined>(undefined)
  const tenants = useTenantDescription()
  const tenant = useTenant()
  const switchTenant = useTenantSwitch()

  useEffect(() => {
    if (authSvc) {
      authSvc?.getUser().then(u => setUser(u))
    }
  }, [authSvc]);

  useEffect(() => {
    if (tenants) {
      setSortedTenants([...tenants].sort((a, b) => a.tenant.localeCompare(b.tenant)))
    }
  }, [tenants])

  const onSwitchTenant = (e: SelectCustomEvent<string>) => {
    const tenant = e.detail.value;
    switchTenant(tenant)
  }

  return (
    <IonContent className="ion-padding">
      <IonItem>
        <div style={{marginBottom: "8px", textAlign: "center", width: "100%"}}>
      <IonToolbar style={{textAlign: "center"}}>
        <IonAvatar style={{margin: "auto"}}>
          <IonIcon icon={personCircle} size={"large"} style={{width: "2em", height: "2em"}}></IonIcon>
        </IonAvatar>
        <IonLabel style={{fontSize: "14px"}}>{user?.profile.email}</IonLabel>
      </IonToolbar>
        </div>
      </IonItem>
      <IonItem lines="none">
        <div style={{padding:'10px', width:"100%"}}>
          <IonSelect fill="outline" label="Auswahl Gemeinschaft" labelPlacement={"floating"} className="select-box"
                     value={tenant.tenant}
                     onIonChange={onSwitchTenant}
          >
            {sortedTenants && sortedTenants.map((o, idx) => (
                <IonSelectOption key={idx} value={o.tenant}>{o.tenant}-{o.name}</IonSelectOption>
              )
            )}
          </IonSelect>
        </div>
      </IonItem>
      <div style={{marginTop: "16px"}}>
      <IonItem button onClick={() => authSvc?.redirectToUserAccount()} lines="full">
        <IonIcon aria-hidden="true" icon={refreshOutline} slot="start" size="small"></IonIcon>
        <IonLabel style={{fontSize: "16px"}}>{t("menu.changePassword")}</IonLabel>
      </IonItem>
      <IonItem button onClick={() => authSvc?.logout()} lines="full">
        <IonIcon aria-hidden="true" icon={logOutOutline} slot="start" size="small"></IonIcon>
        <IonLabel style={{fontSize: "16px"}}>{t("menu.logout")}</IonLabel>
      </IonItem>
      </div>
    </IonContent>
  )
}



interface AppPage {
  url: string;
  iosIcon: string;
  mdIcon: string;
  title: string;
  forOnline?: boolean;
}

const Menu: FC = () => {
  const location = useLocation();
  const eeg = useAppSelector(eegSelector);
  const {isAdmin} = useAccessGroups()
  const {t} = useLocale("common")
  const authSvr = useUser()

  // const [userDetail, dismissUserDetail] = useIonPopover(<UserDetailPopover authSvc={authSvr} />, {
  //   onDismiss: (data: any, role: string) => dismissUserDetail(data, role),
  // });

  const popover = useRef<HTMLIonPopoverElement>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const openPopover = (e: any) => {
    popover.current!.event = e;
    setPopoverOpen(true);
  };

  const appPages: AppPage[] = [
    {
      title: t("menu.dashboard"),
      url: '/page/dashboard',
      iosIcon: eegChatIcon,
      mdIcon: eegChatIcon
    },
    {
      title: eeg ? eeg.name : t("menu.eeg_name"),
      url: '/page/eeg',
      iosIcon: newspaper,
      mdIcon: newspaper
    },
    {
      title: t("menu.participants"),
      url: '/page/participants',
      iosIcon: people,
      mdIcon: people
    },
    {
      title: t("menu.rates"),
      url: '/page/rates',
      iosIcon: wallet,
      mdIcon: walletSharp
    },
    // {
    //   title: 'Profil',
    //   url: '/page/profiles',
    //   iosIcon: person,
    //   mdIcon: person
    // },
  ];

  const adminPages: AppPage[] = [
    {
      title: t("menu.prcesses"),
      url: '/page/processes',
      iosIcon: eegProcess,
      mdIcon: eegProcess,
      forOnline: true,
    },
  ];

/////////////////////////////////////////////////////////////////////////////////////////////////////
  // TEST
  const modal = useRef<HTMLIonModalElement>(null);

  function dismiss() {
    modal.current?.dismiss();
  }

  const enterAnimation = (baseEl: HTMLElement) => {
    const root = baseEl.shadowRoot;

    const backdropAnimation = createAnimation()
      .addElement(root?.querySelector('ion-backdrop')!)
      .fromTo('opacity', '0.01', 'var(--backdrop-opacity)');

    const wrapperAnimation = createAnimation()
      .addElement(root?.querySelector('.modal-wrapper')!)
      .keyframes([
        {offset: 0, opacity: '0', transform: 'scale(0)'},
        {offset: 1, opacity: '0.99', transform: 'scale(1)'},
      ]);

    return createAnimation()
      .addElement(baseEl)
      .easing('ease-out')
      .duration(500)
      .addAnimation([backdropAnimation, wrapperAnimation]);
  };

  const leaveAnimation = (baseEl: HTMLElement) => {
    return enterAnimation(baseEl).direction('reverse');
  };

  return (
    <IonMenu contentId="main" type="overlay">
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>EEG <span style={{color: "#79DFB4"}}>Faktura</span></IonTitle>
          <IonChip slot="end" onClick={openPopover}>
            <IonAvatar>
              <img alt="Silhouette of a person's head" src="/assets/icon/avatar.svg" />
              {/*<IonIcon icon={eegAvatar} size="large"/>*/}
            </IonAvatar>
            <IonLabel style={{color: "white"}}>...</IonLabel>
          </IonChip>
        </IonToolbar>
      </IonHeader>
      <IonPopover className="user-popup-menu" ref={popover} isOpen={popoverOpen} onDidDismiss={() => setPopoverOpen(false)} side="bottom" alignment="end" size="auto" dismissOnSelect={true} reference="trigger">
        <UserDetailPopover authSvc={authSvr} />
      </IonPopover>
      <IonContent>
        <IonItem button lines="full" routerLink={"/page/notifications"} routerDirection="none">
          <IonIcon aria-hidden="true" slot="start" ios={eegChartBubble} md={eegChartBubble}/>
          <IonLabel>Messages</IonLabel>
        </IonItem>
        <IonList id="inbox-list">
          {appPages.map((appPage, index) => {
            return (
              <IonMenuToggle key={index} autoHide={false}>
                <IonItem className={location.pathname === appPage.url ? 'selected' : ''} routerLink={appPage.url}
                         routerDirection="none" lines="none" detail={false}>
                  <IonIcon aria-hidden="true" slot="start" ios={appPage.iosIcon} md={appPage.mdIcon}/>
                  <IonLabel>{appPage.title}</IonLabel>
                </IonItem>
              </IonMenuToggle>
            );
          })}
          {isAdmin() && adminPages.filter(p => !(p.forOnline && p.forOnline !== eeg?.online)).map((adminPage, adminIdx) => {
            return (
              <IonMenuToggle key={appPages.length + adminIdx} autoHide={false}>
                <IonItem className={location.pathname === adminPage.url ? 'selected' : ''} routerLink={adminPage.url}
                         routerDirection="none" lines="none" detail={false}>
                  <IonIcon aria-hidden="true" slot="start" ios={adminPage.iosIcon} md={adminPage.mdIcon}/>
                  <IonLabel>{adminPage.title}</IonLabel>
                </IonItem>
              </IonMenuToggle>
            )
          })}
        </IonList>

        {/*<IonList id="labels-list">*/}
        {/*  <IonListHeader>Labels</IonListHeader>*/}
        {/*  {labels.map((label, index) => (*/}
        {/*    <IonItem lines="none" key={index}>*/}
        {/*      <IonIcon aria-hidden="true" slot="start" icon={bookmarkOutline} />*/}
        {/*      <IonLabel>{label}</IonLabel>*/}
        {/*    </IonItem>*/}
        {/*  ))}*/}
        {/*</IonList>*/}
      </IonContent>
      <IonFooter>
        <IonMenuToggle autoHide={false}>
          <IonItem className={location.pathname === "/pages/info" ? 'selected' : ''} id={"open-modal"} lines="none"
                   detail={false}>
            <IonIcon aria-hidden="true" slot="start" ios={informationCircle} md={informationCircle}/>
            <IonLabel>{"Info"}</IonLabel>
          </IonItem>
        </IonMenuToggle>
        <IonModal
          id="example-modal"
          ref={modal}
          trigger="open-modal"
          enterAnimation={enterAnimation}
          leaveAnimation={leaveAnimation}
        >
          <IonContent color="eeg">
            <IonToolbar>
              <IonTitle>Impressum</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => dismiss()}>Close</IonButton>
              </IonButtons>
            </IonToolbar>
            <div style={{padding: "25px", fontSize:"14px"}}>
              <img alt="vfeeg" src="/assets/vfeeg-image.png"
                   style={{width: "150px", background: "rgb(16, 57, 49)"}}/>
              <p>Verein zur Förderung von Erneuerbaren Energiegemeinschaften</p>
              <p>ZVR-Zahl 1528480260</p>
              <p>Obmensch: Harald Geissler</p>
              <p>Anschrift: Fellingerstraße 9, 4730 Waizenkirchen</p>
            </div>
            <div>
              <img src="/assets/leader-image-v1.png"/>
              <div style={{padding: "10px"}}>
                <div>
                <a href="https://ec.europa.eu/info/departments/agriculture-and-rural-development_de"
                   style={{fontSize: "12px"}}>https://ec.europa.eu/info/departments/agriculture-and-rural-development_de</a>
                </div>
                <div>
                <a href="https://www.bml.gv.at/" style={{fontSize: "12px"}}>https://www.bml.gv.at/</a>
                </div>
                <div>
                <a href="https://www.land-oberoesterreich.gv.at/"
                   style={{fontSize: "12px"}}>https://www.land-oberoesterreich.gv.at/</a>
                </div>
              </div>
            </div>
          </IonContent>
          <IonFooter color="eeg">
            <IonItem lines="none" style={{fontSize: "12px", textAlign: "center"}}>
              <IonLabel>eegFaktura ist eine freie und quelloffene Software und steht unter der AGPL</IonLabel>
            </IonItem>
          </IonFooter>
        </IonModal>
      </IonFooter>
    </IonMenu>
  );
};

export default Menu;
