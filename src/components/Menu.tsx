import {
  createAnimation,
  IonAvatar,
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuToggle,
  IonModal,
  IonPopover,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  SelectCustomEvent,
  useIonPopover,
  SelectChangeEventDetail,
} from "@ionic/react";

import {useLocation} from 'react-router-dom';
import {
  informationCircle, logOutOutline, newspaper,
  people, personCircle, refreshOutline, wallet, walletSharp
} from 'ionicons/icons';
import './Menu.css';
import React, {FC, useEffect, useRef, useState} from "react";
import {eegAvatar, eegChartBubble, eegChatIcon, eegProcess} from "../eegIcons";
import {useAppDispatch, useAppSelector} from "../store";
import {eegSelector,selectedTenant, selectTenant, updateEegModel} from "../store/eeg";
import {
  useAccessGroups,
  useTenant,
  useTenantSwitch,
} from "../store/hook/Eeg.provider";
import { useTenants } from "../store/hook/AuthProvider";
import {useUser} from "../store/hook/AuthProvider";
import {AuthService} from "../service/auth.service";
import {User} from "oidc-client-ts";
import {useAuth} from "react-oidc-context";
import {useLocale} from "../store/hook/useLocale";
import { useForm } from 'react-hook-form';
import { AccountInfo, Address, Contact, Eeg, Optionals } from '../models/eeg.model';
import { IonSelectCustomEvent } from "@ionic/core/dist/types/components";

// const UserDetailPopover = (logout: () => Promise<void>, user: User) =>
const UserDetailPopover:FC<{authSvc: AuthService | undefined}> = ({authSvc}) => {
  const {t} = useLocale("common")
  const [user, setUser] = useState<User|null>()
  useEffect(() => {
    if (authSvc) {
      authSvc?.getUser().then(u => setUser(u))
    }
  }, [authSvc]);
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
      title: t("Stammdaten"),
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
  
const { tenant } = useTenant();
const dispatcher = useAppDispatch();

const switchTenant = useTenantSwitch();

const {
  handleSubmit,
  setValue,
  reset,
  control,
  formState: { errors, isDirty, dirtyFields },
} = useForm({
  defaultValues: eeg,
  values: eeg,
  mode: "all",
});
const [tenantsState, setTenantsState] = useState<string[]>([]);
const tenants = useTenants();

useEffect(() => {
  // setTenantState(tenant);
  setTenantsState(
    tenants.map((t) => t.toUpperCase()).sort((a, b) => a.localeCompare(b))
  );
}, [tenants]);

const EMPTY_EEG_ENTITY = {
  communityId: "", rcNumber: "", name: "",
  legal: "", salesTax: "", taxNumber: "", vatNumber: "",
  businessNr: "", settlement: "", description: "", gridOperator: "", operatorName: "",
  settlementInterval: 'MONTHLY', allocationMode: "DYNAMIC", area: "LOCAL",
  address: {city: "", type: "BILLING", street: "", streetNumber: "", zip: ""} as Address,
  contact: {email: "", phone: ""} as Contact,
  accountInfo: {bankName: "", iban: "", owner: "", sepa: false} as AccountInfo,
  optionals: {website: ""} as Optionals,
  online: false,
} as Eeg

useEffect(() => {
  if (!eeg) {
    reset(EMPTY_EEG_ENTITY, { keepDefaultValues: true });
  } else {
    reset(eeg);
  }
}, [eeg]);

const onSwitchTenant = (e: SelectCustomEvent<string>) => {
  const tenant = e.detail.value;
  switchTenant(tenant);
};

const onChangeField = (mapper: string) => (name: string, value: any) => {
  dispatcher(
    updateEegModel({
      tenant,
      eeg: { [mapper]: value },
    })
  );
};

const onChangeValue =
  (property: string) => (e: IonSelectCustomEvent<SelectChangeEventDetail>) => {
    dispatcher(updateEegModel({ tenant, eeg: { [property]: e.detail.value } }));
  };

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
          <IonTitle style={{ paddingLeft: "20px", color: "#79DFB4",paddingTop : "20px" }}>
            {eeg?.name}
          </IonTitle>

          <IonChip slot="end" onClick={openPopover}>
            <IonAvatar>
              <img
                alt="Silhouette of a person's head"
                src="/assets/icon/avatar.svg"
              />
              {/*<IonIcon icon={eegAvatar} size="large"/>*/}
            </IonAvatar>
            <IonLabel style={{ color: "white" }}>...</IonLabel>
          </IonChip>

          <IonList className="select-box" lines="none">
            <IonItem lines="none">
              <IonSelect
                fill="outline"
                value={tenant}
                onIonChange={onSwitchTenant}
              >
                {tenantsState &&
                  tenantsState.map((o, idx) => (
                    <IonSelectOption key={idx} value={o}>
                      {o}
                    </IonSelectOption>
                  ))}
              </IonSelect>
            </IonItem>
          </IonList>
        </IonToolbar>
      </IonHeader>
      <IonPopover
        ref={popover}
        isOpen={popoverOpen}
        onDidDismiss={() => setPopoverOpen(false)}
        side="bottom"
        alignment="end"
        size="auto"
        style={{ "--width": "300px" }}
      >
        <UserDetailPopover authSvc={authSvr} />
      </IonPopover>
      <IonContent>
        <IonItem
          button
          lines="full"
          routerLink={"/page/notifications"}
          routerDirection="none"
        >
          <IonIcon
            aria-hidden="true"
            slot="start"
            ios={eegChartBubble}
            md={eegChartBubble}
          />
          <IonLabel>Messages</IonLabel>
        </IonItem>
        <IonList id="inbox-list">
          {appPages.map((appPage, index) => {
            return (
              <IonMenuToggle key={index} autoHide={false}>
                <IonItem
                  className={
                    location.pathname === appPage.url ? "selected" : ""
                  }
                  routerLink={appPage.url}
                  routerDirection="none"
                  lines="none"
                  detail={false}
                >
                  <IonIcon
                    aria-hidden="true"
                    slot="start"
                    ios={appPage.iosIcon}
                    md={appPage.mdIcon}
                  />
                  <IonLabel>{appPage.title}</IonLabel>
                </IonItem>
              </IonMenuToggle>
            );
          })}
          {isAdmin() &&
            adminPages
              .filter((p) => !(p.forOnline && p.forOnline !== eeg?.online))
              .map((adminPage, adminIdx) => {
                return (
                  <IonMenuToggle
                    key={appPages.length + adminIdx}
                    autoHide={false}
                  >
                    <IonItem
                      className={
                        location.pathname === adminPage.url ? "selected" : ""
                      }
                      routerLink={adminPage.url}
                      routerDirection="none"
                      lines="none"
                      detail={false}
                    >
                      <IonIcon
                        aria-hidden="true"
                        slot="start"
                        ios={adminPage.iosIcon}
                        md={adminPage.mdIcon}
                      />
                      <IonLabel>{adminPage.title}</IonLabel>
                    </IonItem>
                  </IonMenuToggle>
                );
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
          <IonItem
            className={location.pathname === "/pages/info" ? "selected" : ""}
            id={"open-modal"}
            lines="none"
            detail={false}
          >
            <IonIcon
              aria-hidden="true"
              slot="start"
              ios={informationCircle}
              md={informationCircle}
            />
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
            <div style={{ padding: "25px", fontSize: "14px" }}>
              <img
                alt="vfeeg"
                src="/assets/vfeeg-image.png"
                style={{ width: "150px", background: "rgb(16, 57, 49)" }}
              />
              <p>Verein zur Förderung von Erneuerbaren Energiegemeinschaften</p>
              <p>ZVR-Zahl 1528480260</p>
              <p>Obmensch: Harald Geissler</p>
              <p>Anschrift: Fellingerstraße 9, 4730 Waizenkirchen</p>
            </div>
            <div>
              <img src="/assets/leader-image-v1.png" />
              <div style={{ padding: "10px" }}>
                <div>
                  <a
                    href="https://ec.europa.eu/info/departments/agriculture-and-rural-development_de"
                    style={{ fontSize: "12px" }}
                  >
                    https://ec.europa.eu/info/departments/agriculture-and-rural-development_de
                  </a>
                </div>
                <div>
                  <a href="https://www.bml.gv.at/" style={{ fontSize: "12px" }}>
                    https://www.bml.gv.at/
                  </a>
                </div>
                <div>
                  <a
                    href="https://www.land-oberoesterreich.gv.at/"
                    style={{ fontSize: "12px" }}
                  >
                    https://www.land-oberoesterreich.gv.at/
                  </a>
                </div>
              </div>
            </div>
          </IonContent>
          <IonFooter color="eeg">
            <IonItem
              lines="none"
              style={{ fontSize: "12px", textAlign: "center" }}
            >
              <IonLabel>
                eegFaktura ist eine freie und quelloffene Software und steht
                unter der AGPL
              </IonLabel>
            </IonItem>
          </IonFooter>
        </IonModal>
      </IonFooter>
    </IonMenu>
  );
};

export default Menu;
