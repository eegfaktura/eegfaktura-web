import React, {FC, useEffect, useState} from "react";
import {useForm} from "react-hook-form";
import {BillingConfig} from "../models/eeg.model";
import {
    IonButton,
    IonCard,
    IonChip,
    IonIcon,
    IonImg,
    IonLabel,
    useIonPopover,
    useIonToast
} from "@ionic/react";
import {closeCircleOutline, imageOutline} from "ionicons/icons";
import {useAppDispatch, useAppSelector} from "../store";
import {billingConfigErrorSelector, billingConfigSelector} from "../store/billingConfig";
import UploadImagePopup from "./dialogs/uploadImage.popup";
import {useAccessGroups, useTenant} from "../store/hook/Eeg.provider";
import {selectedTenant} from "../store/eeg";
import {
    createBillingConfig,
    deleteImageBillingConfig,
    fetchBillingConfig,
    updateBillingConfig,
    uploadImageBillingConfig
} from "../store/billingConfig/actions";
import InputForm from "./form/InputForm.component";
import {Api} from "../service";

const EegBillingConfigCardComponent: FC = () => {

    // const BILLING_API_SERVER = import.meta.env.VITA_BILLING_SERVER_URL;

    const {isAdmin} = useAccessGroups()
    const {tenant} = useTenant()
    const billingConfig = useAppSelector(billingConfigSelector)
    const dispatcher = useAppDispatch();
    const billingConfigErrorMessage = useAppSelector(billingConfigErrorSelector);
    const [logoImageSrc, setLogoImageSrc] = useState('');

    const {handleSubmit, control, formState: {isDirty, dirtyFields}} =
        useForm({
            defaultValues: billingConfig!,
            values: billingConfig!,
            mode: "all",
        })
    
    const [uploadLogoPopover, dismissLogoUpload] = useIonPopover(UploadImagePopup, {
        tenant,
        imageType: 'logo',
        onDismiss: (data: any, role: string) => dismissLogoUpload(data, role)
    });
    //@TODO (low prio): Implement uploading of footer image also
    const [uploadFooterPopover, dismissFooterUpload] = useIonPopover(UploadImagePopup, {
        tenant,
        imageType: 'footer',
        onDismiss: (data: any, role: string) => dismissFooterUpload(data, role)
    });

    const onSubmit = (billingConfigData: BillingConfig) => {
        if (!billingConfigData) return;
        if (Object.keys(dirtyFields).length > 0) {
            dispatcher(updateBillingConfig({tenant, billingConfig : billingConfigData}))
                .then(() => succesToast("Änderung gespeichert"));
        }
    }

    const onClickCreateBillingConfig = () : void => {
        if (!billingConfig && tenant) {
            dispatcher(createBillingConfig({tenant}));
        }
    }

    const [toaster] = useIonToast()

    const errorToast = (message: string) => {
        toaster({
            message: message,
            duration: 3500,
            position: 'bottom',
            color: "danger"
        });
    };

    const succesToast = (message: string) => {
        toaster({
            message: message,
            duration: 3500,
            position: 'bottom',
            color: "success"
        });
    };

    useEffect( () => {
        if (billingConfigErrorMessage) {
            errorToast(billingConfigErrorMessage);
        }
    }, [billingConfigErrorMessage]);

    useEffect( () => {
        dispatcher(fetchBillingConfig({
            tenant: tenant
        }))
    }, [tenant])

    useEffect( () => {
        if (billingConfig && billingConfig.headerImageFileDataId) {
            Api.eegService.getImageBillingConfig(tenant, billingConfig, 'logo' )
                .then(imageBlob => setLogoImageSrc(URL.createObjectURL(imageBlob)));
        }
    }, [billingConfig])

    const onUploadImage = (data: any) => {
        if (data) {
            const [file, imageType] = data
            if (imageType && file && file.length === 1) {
                dispatcher(uploadImageBillingConfig({tenant, billingConfig:billingConfig!, imageType, file: file[0]}))
            }
        }
    }

    const onDeleteImage = (billingConfigId : string, imageType : 'logo' | 'footer') => {
        if (billingConfig && tenant) {
            dispatcher(deleteImageBillingConfig({billingConfig, imageType, tenant}))
        }
    }

    return (
        <div className={"eeg-property-card"}>
            <div className={"header"}>Abrechnungseinstellungen</div>
                <IonCard color="eeglight">
                    {
                        !billingConfig &&
                        <>
                            <IonButton onClick={() => onClickCreateBillingConfig()}>Abrechnungseinstellungen hinzufügen</IonButton>
                        </>
                    }


                    {
                        billingConfig &&
                        <form onBlur={handleSubmit(onSubmit)}>
                            <InputForm name={"beforeItemsTextInvoice"}
                                                label="Rechnungen: Text vor Positionen"
                                                control={control}
                                                type="text" readonly={!isAdmin()}/>
                            <InputForm name={"afterItemsTextInvoice"}
                                                label="Rechnungen: Text nach Positionen"
                                                control={control}
                                                type="text" readonly={!isAdmin()}/>
                            <InputForm name={"termsTextInvoice"}
                                                label="Rechnungen: Abschlusstext (zB für Bedingungen)"
                                                control={control}
                                                type="text" readonly={!isAdmin()}/>
                            <InputForm name={"invoiceNumberPrefix"}
                                                label="Präfix für Rechnungsnummern"
                                                control={control}
                                                type="text" readonly={!isAdmin()}/>
                            <InputForm name={"invoiceNumberStart"}
                                                label="Startwert für Rechnungsnummer"
                                                control={control}
                                                rules={{min: 0}}
                                                type="number" readonly={!isAdmin()}/>

                            <InputForm name={"beforeItemsTextCreditNote"}
                                                label="Gutschriften: Text vor Positionen"
                                                control={control}
                                                type="text" readonly={!isAdmin()}/>
                            <InputForm name={"afterItemsTextCreditNote"}
                                                label="Gutschriften: Text nach Positionen"
                                                control={control}
                                                type="text" readonly={!isAdmin()}/>
                            <InputForm name={"termsTextCreditNote"}
                                                label="Gutschriften: Abschlusstext"
                                                control={control}
                                                type="text" readonly={!isAdmin()}/>
                            <InputForm name={"creditNoteNumberPrefix"}
                                                label="Präfix für Gutschriftennummern"
                                                control={control}
                                                type="text" readonly={!isAdmin()}/>
                            <InputForm name={"creditNoteNumberStart"}
                                                label="Startwert für Gutschriftennummern"
                                                rules={{min: 0}}
                                                control={control}
                                                type="number" readonly={!isAdmin()}/>

                            <InputForm name={"beforeItemsTextInfo"}
                                                label="Gutschriften für Firmen: Text vor Positionen"
                                                control={control}
                                                type="text" readonly={!isAdmin()}/>
                            <InputForm name={"afterItemsTextInfo"}
                                                label="Gutschriften für Firmen: Text nach Positionen"
                                                control={control}
                                                type="text" readonly={!isAdmin()}/>
                            <InputForm name={"termsTextInfo"}
                                                label="Gutschriften für Firmen: Abschlusstext"
                                                control={control}
                                                type="text" readonly={!isAdmin()}/>

                            <InputForm name={"footerText"}
                                                label="Text für Fußzeile"
                                                control={control}
                                                type="text" readonly={!isAdmin()}/>

                            <InputForm name={"documentNumberSequenceLength"}
                                                label="Dokumentennummer: Anzahl Stellen (wird mit führenden Nulle aufgefüllt)"
                                                rules={{min: 1, max: 6}}
                                                control={control}
                                                type="number" readonly={!isAdmin()}/>
                        </form>
                    }

                    {
                        billingConfig &&
                        <>
                            <IonChip>
                                <IonIcon icon={imageOutline}></IonIcon>
                                <IonLabel
                                    onClick={(e: any) =>
                                        uploadLogoPopover({
                                            event: e,
                                            size: "auto",
                                            side: "bottom",
                                            alignment: "start",
                                            cssClass: "upload-popover",
                                            onDidDismiss: (e: CustomEvent) => onUploadImage(e.detail.data),
                                        })
                                    }
                                >Bild für Logo</IonLabel>
                                {
                                    billingConfig.headerImageFileDataId &&
                                        <IonIcon icon={closeCircleOutline}
                                        onClick={(e:any) => onDeleteImage(billingConfig.id, 'logo')}></IonIcon>
                                }
                            </IonChip>
                            {
                                billingConfig.headerImageFileDataId &&
                                <IonImg
                                    src={logoImageSrc}
                                    alt="Logo Bild"
                                ></IonImg>
                            }
                        </>
                    }
                </IonCard>
        </div>
)}

export default EegBillingConfigCardComponent;