import React, {FC, useEffect} from "react";
import {FormProvider, useForm} from "react-hook-form";
import {useAppDispatch, useAppSelector} from "../../store";
import {ratesSelector} from "../../store/rate";
import {selectedTenant} from "../../store/eeg";
import {
  selectedMeterSelector,
  selectedParticipantSelector,
  updateMeteringPoint,
  updateMeteringPointPartFact
} from "../../store/participant";
import {Metering} from "../../models/meteringpoint.model";
import MeterFormElement from "../core/MeterForm.element";
import EegPaneTemplate from "../core/EegPane.template";
import MeterAddressFormElement from "../core/forms/MeterAddressForm/MeterAddressForm.element";
import {useOnlineState, useTenant} from "../../store/hook/Eeg.provider";

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

  const formMethods = useForm<Metering>({defaultValues: metering});
  const {handleSubmit, formState: { dirtyFields}, reset, setValue} = formMethods

  useEffect(() => {
    reset(metering)
  }, [metering])

  const onSubmit = (meter: Metering) => {
    if (Object.keys(dirtyFields).length > 0) {
      const participantId = participant?.id;
      if (participantId) {
        dispatcher(updateMeteringPoint({tenant, participantId, meter}))
        reset(meter);
      }
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
    console.log("1.OnChangePartFact", name, formMethods.getFieldState(name as keyof Metering, formMethods.formState))
    if (invalid || !isDirty) {
      return
    }
    console.log("OnChangePartFact", name, value, typeof value, formMethods)
    // setValue(name as keyof Metering, value, {shouldDirty: true, shouldValidate: true})
    const participantId = participant?.id;
    if (participantId && metering) {
      const meter = metering.meteringPoint
      await dispatcher(updateMeteringPointPartFact({tenant, participantId, meter, value}))
      reset({[name]: value})
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
        <FormProvider {...formMethods} >
          <MeterFormElement rates={rates} meterReadOnly={true} onChange={onChange} onPartChange={onChangePartFact}/>
          <MeterAddressFormElement onChange={onChange} isOnline={isOnline}/>
        </FormProvider>
      </EegPaneTemplate>
    // </form>
  )
}

export default MeterFormComponent;