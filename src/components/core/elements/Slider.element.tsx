import {ChangeEvent, ChangeEventHandler, FC, useState} from "react";

import './Slider.element.scss'
import {set} from "react-hook-form";

const SliderElement: FC<{online: number, onSlide: (v: number) => void}> = ({online, onSlide}) => {

  const [value, setValue] = useState<number>(online)

  const onChange = (e: ChangeEvent<HTMLInputElement> | undefined) => {
    if (e) {
      const slideValue = Number(e.target.value) === 0 ? 1 : 0
      setValue(slideValue)
      onSlide(slideValue)
    }
  }

  return (
    <label className="switch">
      <input type="checkbox" value={value} onChange={onChange}/>
      <span className="slider"></span>
    </label>
  )
}

export default SliderElement