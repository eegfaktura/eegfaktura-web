import React, {FC, useEffect} from "react";
import {FormProvider, useForm} from "react-hook-form";
import {useAppDispatch, useAppSelector} from "../../store";
import {ratesSelector} from "../../store/rate";
import {
  selectedMeterSelector,
  selectedParticipantSelector,
  updateMeteringPoint,
  updateMeteringPointPartFact
} from "../../store/participant";
import {Metering} from "../../models/meteringpoint.model";
import MeterFormElement from "./MeterForm.element";
import EegPaneTemplate from "./EegPane.template";
import MeterAddressFormElement from "./forms/MeterAddressForm/MeterAddressForm.element";
import {useOnlineState, useTenant} from "../../store/hook/Eeg.provider";
import SaveStatus, {useSaveStatus} from "./SaveStatus.component";

interface MeterFromComponentProps {
  meteringPoint: Metering
}

const MeterFormComponent: FC<MeterFromComponentProps> = ({meteringPoint}) => {

  const dispatcher = useAppDispatch()
  const participant = useAppSelector(selectedParticipantSelector);

  const rates = useAppSelector(ratesSelector);
  const {tenant} = useTenant();
  const metering = useAppSelector(selectedMeterSelector);

  const isOnline = useOnlineState()

  // const [withWechselrichter, setWithWechselrichter] = useState(false);

  // const {handleSubmit, control, watch, formState: {errors, isDirty, dirtyFields}, reset, clearErrors} = useForm<Metering>({mode: 'onBlur', defaultValues: {...meteringPoint}, values: metering});

  const formMethods = useForm<Metering>({defaultValues: metering, mode: "all"});
  const {handleSubmit, formState: { dirtyFields}, reset, setValue} = formMethods

  useEffect(() => {
    reset(metering, {keepDirtyValues: true})  // a store update must not overwrite unsaved input
  }, [metering])

  // mark as saved only after the save worked; a failure keeps the input (error toast: store middleware)
  const saveMeter = (participantId: string, meter: Metering) =>
    dispatcher(updateMeteringPoint({tenant, participantId, meter}))
      .unwrap()
      .then(() => { reset(meter); return true })
      .catch(() => false)

  const savePartFact = (participantId: string, meter: string, name: string, value: any) =>
    dispatcher(updateMeteringPointPartFact({tenant, participantId, meter, value: Number(value)}))
      .unwrap()
      .then(() => { formMethods.resetField(name as keyof Metering, {defaultValue: value}); return true })
      .catch(() => false)

  // the form saves on its own: the status shows whether all changes are saved and offers a retry (platform#228 step 4).
  // "meter" stands for a save of the whole metering point, the participation factor saves on its own.
  const saveStatus = useSaveStatus((name, value) => {
    const participantId = participant?.id
    if (!participantId || !metering) return Promise.resolve(false)
    return name === "meter" ? saveMeter(participantId, value) : savePartFact(participantId, metering.meteringPoint, name, value)
  })

  const onSubmit = (meter: Metering) => {
    if (Object.keys(dirtyFields).length > 0 && participant?.id) {
      saveStatus.save("meter", meter)
    }
  }

  const onChangeDate = (name: string, value: any) => {
    handleSubmit((data) => onSubmit(data))()
  }

  const onChangePartFact = async (name: string, value: any, event?: any) => {
    /*event.preventDefault && */event.preventDefault();
    event.stopPropagation()
    event.persist && event.persist();

    const {invalid, isDirty} = formMethods.getFieldState(name as keyof Metering, formMethods.formState)
    if (invalid || !isDirty) {
      return
    }

    const _factValue = Number(value)
    if (isNaN(_factValue) || _factValue > 100 || _factValue < 1) {
      return  // used to reset the whole form; the field's 1-100 rule shows the error
    }

    // setValue(name as keyof Metering, value, {shouldDirty: true, shouldValidate: true})
    if (participant?.id && metering) {
      // reset({[name]: value}) replaced all form values with this one field, also after a failed save
      await saveStatus.save(name, value)
    }
  }

  const onChange = (values: {name: string, value: any}[], event?: any) => {
    values.forEach(v => {
      setValue(v.name as keyof Metering, v.value, {shouldDirty: true, shouldValidate: true})
    })
    handleSubmit((data) => onSubmit(data))(event)
    // handleSubmit((data) => console.log("DATA:", data))(event)
  }

  return (
    // <form onBlur={handleSubmit((data) => onSubmit(data))}>
      <EegPaneTemplate>
        <SaveStatus status={saveStatus}/>
        <FormProvider {...formMethods} >
          <MeterFormElement rates={rates} meterReadOnly={true} onChange={onChange} onPartChange={onChangePartFact}/>
          <MeterAddressFormElement onChange={onChange} isOnline={isOnline} showActivationMode={true}/>
        </FormProvider>
      </EegPaneTemplate>
    // </form>
  )
}

export default MeterFormComponent;