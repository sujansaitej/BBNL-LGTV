import { TextField } from "@mui/material";

const SearchTextField = ({
  value,
  onChange,
  onKeyDown,
  onFocus,
  onBlur,
  placeholder = "Enter 10 Digit Number",
  type = "tel",
  fullWidth = true,
  autoFocus = true,
  inputMode = "numeric",
  pattern = "[0-9]*",
  maxLength = 10,
  sx = {},
  InputProps = {},
}) => {
  return (
    <TextField
      fullWidth={fullWidth}
      autoFocus={autoFocus}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder={placeholder}
      type={type}
      inputProps={{
        inputMode,
        pattern,
        maxLength,
        "data-webos-input": "true",
      }}
      InputProps={{
        ...InputProps,
        sx: {
          height: 80,
          bgcolor: "#0F172A",
          border: "1px solid #1E293B",
          borderRadius: "14px",
          color: "#fff",
          fontSize: 32,
          fontWeight: 700,
          transition: "all 0.2s ease",
          "&:hover": {
            border: "1px solid #334155",
          },
          "&.Mui-focused": {
            border: "1px solid #1E293B",
            boxShadow: "none",
            outline: "none",
          },
          "& fieldset": { border: "none" },
          "& input::placeholder": {
            color: "#475569",
            opacity: 1,
            fontSize: 32,
            fontWeight: 700,
          },
          ...InputProps?.sx,
        },
      }}
      sx={sx}
    />
  );
};

export default SearchTextField;
