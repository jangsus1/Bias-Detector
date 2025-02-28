import {
    Modal,
    Typography,
    Box,
} from "@mui/material";

const Message = ({
    modalOpen,
    modalContent,
}) => {
    return (
        <Modal
            open={modalOpen}
            aria-labelledby="message-modal-modal-title"
            aria-describedby="message-modal-modal-description"
        >   
            <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 600, // Adjusted for better fit
                bgcolor: 'background.paper',
                border: '2px solid #000',
                boxShadow: 24,
                p: 4,
            }}>
                <Typography id="message-modal-modal-title" variant="h6" component="h2">
                    {modalContent.current}
                </Typography>
            </Box>
        </Modal>
    );
}

export default Message;
