import React, {FC} from "react";
import {IonButton, IonIcon, RouterDirection} from "@ionic/react";

interface HeaderFavButtonProps {
  onClick?: (e?: any) => void;
  icon?: string;
  routerLink?: string;
  routerDirection?: RouterDirection;
}

const HeaderFavButtonComponent: FC<HeaderFavButtonProps> = ({icon, ...rest}) => {
  return (
    <IonButton color="primary" shape="round" fill={"solid"} className={"header-fav-button"} {...rest}>
      <IonIcon slot="icon-only" icon={icon}></IonIcon>
    </IonButton>
  )
}

export default HeaderFavButtonComponent