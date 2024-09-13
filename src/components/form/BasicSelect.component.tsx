import React, {FC, useEffect, useState} from 'react';

import Select, {OnChangeValue} from 'react-select';
import {Control, Controller, FieldError, useWatch} from "react-hook-form";
import {SelectInterface} from "@ionic/core/dist/types/components/select/select-interface";
import {IonSelectCustomEvent} from "@ionic/core/dist/types/components";
import {IonLabel, SelectChangeEventDetail} from "@ionic/react";
import {ActionMeta} from "react-select/dist/declarations/src/types";

import "./BasicSelect.component.scss"

export interface SelectOptions {
  readonly label: string,
  readonly value: string,
}

type IsMulti<TMultiple = boolean> = TMultiple extends true ? true : false

interface BasicSelectFormProps {
  control: Control<any, any>,
  name: string,
  options: SelectOptions[],
  rules?: object,
  error?: FieldError,
  selectInterface?: SelectInterface,
  disabled?: boolean,
  label: string,
  placeholder?: string,
  readonly?: boolean,
  onIonBlur?: (event: IonSelectCustomEvent<void>) => void,
  onIonDismiss?: (event: IonSelectCustomEvent<void>) => void,
  onIonChange?: (event: IonSelectCustomEvent<SelectChangeEventDetail>) => void,
  multiple?: IsMulti,
  onChangePartial?: (name: string, value: any, event?: any) => void,
  interfaceOptions?: any,
  defaultValue?: string,
}

const getDefaultOption = (options: SelectOptions[], defaultValue?: string) => {
  if (defaultValue) {
    const found = options.find(o => o.value === defaultValue)
    return found === undefined ? null : found
  }
  return null
}

export const BasicSelectComponent: FC<BasicSelectFormProps> = ({control, name, label, options, error, rules, multiple, defaultValue, ...rest}) => {
  const [isClearable, setIsClearable] = useState(true);
  const [isSearchable, setIsSearchable] = useState(true);
  // const [selectedValue, setSelectedValue] = useState<IsMulti extends boolean ? SelectOptions[] | null : SelectOptions | null>(null)
  const [selectedValue, setSelectedValue] = useState<OnChangeValue<SelectOptions, IsMulti>>(getDefaultOption(options, defaultValue))
  const controlValue = useWatch({control, name: name, defaultValue: undefined})


  useEffect(() => {
    if (!controlValue) {
      setSelectedValue(null)
    }
  }, [controlValue]);

  const onSelectionChanged = (change: (...event: any[]) => void) => (selectedOptions: OnChangeValue<SelectOptions, IsMulti>, actionMeta: ActionMeta<OnChangeValue<SelectOptions, IsMulti>>) => {
    if (actionMeta.action === "clear") {
      change(undefined)
      return
    }
    if(selectedOptions) {
      change(multiple ? (selectedOptions as SelectOptions[]).map(s => s.value) : (selectedOptions as SelectOptions).value);
    }
    setSelectedValue(selectedOptions)
  }

  return (
    <>
      <div className="form-element">
        <div style={{paddingBottom: "5px", fontSize: "12px"}}>
          <IonLabel position={"floating"}>{label}</IonLabel>
        </div>
        <Controller
          name={name}
          control={control}
          rules={rules}
          render={({field}) => {
            const {onChange, value} = field;
            return (
              <>
                <Select
                  styles={{
                    // Fixes the overlapping problem of the component
                    menu: provided => ({...provided, zIndex: 9999}),
                    control: provided => ({...provided, minHeight: "42px", background: "transparent", borderColor:"#b3b3b3"})
                  }}
                  isClearable={isClearable}
                  isMulti={multiple}
                  theme={(theme) => ({
                    ...theme,
                    borderRadius: 4,
                    borderColor: '#b3b3b3',
                    colors: {
                      ...theme.colors,
                      primary25: '#79DFB4',
                      primary: '#2B6860',
                    },
                  })}
                  // components={{ Control }}
                  isSearchable={isSearchable}
                  name={name}
                  options={options}
                  onChange={onSelectionChanged(onChange)}
                  value={selectedValue}
                  defaultValue={options.find(o => o.value === value)}
                  isDisabled={rest.disabled}
                />
              </>
            )
          }}
        />
        {/*</IonItem>*/}
        {error && <span className={"error-line"}>{error.message}</span>}
      </div>
    </>
  );
};